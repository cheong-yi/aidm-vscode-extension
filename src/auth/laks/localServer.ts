// localServer.ts
import { EventEmitter } from 'events';
import express from 'express';
import * as vscode from 'vscode';
import * as http from 'http';
import { exchangeCodeForToken } from './tokenService';
import { CONFIG } from '../../common/config';

class LocalServer {
    private static instance: LocalServer | null = null;
    private server: http.Server | null = null;
    private isStarting: boolean = false;
    private readonly PORT = 3000;
    private readonly HOST = '127.0.0.1';
    private authenticationComplete: boolean = false;
    private timeoutId: NodeJS.Timeout | null = null;
    private get TIMEOUT_DURATION() {
        return Number(CONFIG.auth.timeoutSeconds) * 1000; // soo here, we are getting the timeoutSeconds from the settings json, by default it is 30 seconds
    }
    public events = new EventEmitter();
    private constructor() {}

    static getInstance(): LocalServer {
        if (!LocalServer.instance) {
            LocalServer.instance = new LocalServer();
        }
        return LocalServer.instance;
    }

    async start(): Promise<void> {
        if (this.server) {
            console.log('Server is already running');
            return;
        }

        if (this.isStarting) {
            console.log('Server is already starting');
            return;
        }

        this.isStarting = true;
        this.authenticationComplete = false;

        try {
            const app = express();
            this.server = http.createServer(app);

            // Set up the callback route
            app.get('/callback', this.handleCallback.bind(this));

            await this.startServer();

            console.log(`Server running on http://${this.HOST}:${this.PORT}`);
            vscode.window.showInformationMessage('Waiting for authentication...');
            this.startTimeout();
        } catch (error) {
            this.isStarting = false;
            this.events.emit('error', error); // Emit error event
            this.handleStartupError(error);
        }
    }


    private startTimeout(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        this.timeoutId = setTimeout(() => {
            if (!this.authenticationComplete) {
                vscode.window.showErrorMessage(`Authentication timed out after ${CONFIG.auth.timeoutSeconds} seconds`);
                this.stop();
            }
        }, this.TIMEOUT_DURATION);

        // Show warning when half the timeout duration remains
        const warningTime = this.TIMEOUT_DURATION / 2;
        setTimeout(() => {
            if (!this.authenticationComplete && this.server) {
                vscode.window.showWarningMessage(
                    `Authentication will timeout in ${Math.floor(warningTime / 1000)} seconds`
                );
            }
        }, warningTime);
    }

    private async handleCallback(req: express.Request, res: express.Response): Promise<void> {
        const code = req.query.code as string;
        const error = req.query.error as string;
        const error_description = req.query.error_description as string;

        if (error) {
            res.send(this.getErrorHtml(error, error_description));
            vscode.window.showErrorMessage(`Authentication failed: ${error_description || error}`);
            this.events.emit('error', new Error(error_description || error)); // Emit error event
            await this.stop();
            return;
        }

        if (!code) {
            res.send(this.getErrorHtml('No code received', 'Authorization code was not provided'));
            vscode.window.showErrorMessage('No authorization code received');
            this.events.emit('error', new Error('No authorization code received')); // Emit error event
            await this.stop();
            return;
        }

        try {
            const token = await exchangeCodeForToken(code);
            if (token) {
                this.authenticationComplete = true;
                this.clearTimeout();
                res.send(this.getSuccessHtml());
                vscode.window.showInformationMessage('Authentication successful!');
                this.events.emit('success', token); // Emit success event
                setTimeout(() => this.stop(), 3000);
            } else {
                res.send(this.getErrorHtml('Token Exchange Failed', 'Failed to exchange code for token'));
                vscode.window.showErrorMessage('Failed to exchange code for token');
                this.events.emit('error', new Error('Failed to exchange code for token')); // Emit error event
                await this.stop();
            }
        } catch (error) {
            res.send(this.getErrorHtml('Error', error instanceof Error ? error.message : 'Unknown error occurred'));
            this.events.emit('error', error); // Emit error event
            await this.stop();
        }
    }

    private async startServer(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.server) {
                reject(new Error('Server not initialized'));
                return;
            }

            this.server.once('error', (error: NodeJS.ErrnoException) => {
                if (error.code === 'EADDRINUSE') {
                    reject(new Error(`Port ${this.PORT} is already in use`));
                } else {
                    reject(error);
                }
            });

            this.server.listen(this.PORT, this.HOST, () => {
                this.isStarting = false;
                resolve();
            });
        });
    }

    private clearTimeout(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    async stop(): Promise<void> {
        this.clearTimeout();
        if (this.server) {
            return new Promise((resolve) => {
                this.server?.close(() => {
                    console.log('Server stopped');
                    this.server = null;
                    this.isStarting = false;
                    this.authenticationComplete = false;
                    resolve();
                    this.events.emit('error', new Error("Authentication timed out"));

                });
            });
        }
    }

    private handleStartupError(error: unknown): void {
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        vscode.window.showErrorMessage(`Failed to start authentication server: ${message}`);
        console.error('[LocalServer] Startup error:', error);
    }

    private getSuccessHtml(): string {
        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Authentication Successful</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background-color: #f3f3f3;
                        }
                        .container {
                            text-align: center;
                            padding: 2rem;
                            background-color: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        h1 { color: #2ea043; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Authentication Successful!</h1>
                        <p>You can close this window and return to VS Code.</p>
                        <script>
                            setTimeout(() => window.close(), 3000);
                        </script>
                    </div>
                </body>
            </html>
        `;
    }

    private getErrorHtml(error: string, description?: string): string {
        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Authentication Error</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background-color: #f3f3f3;
                        }
                        .container {
                            text-align: center;
                            padding: 2rem;
                            background-color: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        h1 { color: #d73a49; }
                        .description { color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Authentication Error</h1>
                        <p>${error}</p>
                        ${description ? `<p class="description">${description}</p>` : ''}
                        <p>You can close this window and try again in VS Code.</p>
                        <script>
                            setTimeout(() => window.close(), 5000);
                        </script>
                    </div>
                </body>
            </html>
        `;
    }
}

// Export singleton instance methods
export const startLocalServer = () => LocalServer.getInstance().start();
export const stopLocalServer = () => LocalServer.getInstance().stop();
export const getLocalServerInstance = () => LocalServer.getInstance(); // For accessing events