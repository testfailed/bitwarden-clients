import { ActiveAccountService } from 'jslib-common/abstractions/activeAccount.service';
import { NotificationsService } from 'jslib-common/abstractions/notifications.service';
import { VaultTimeoutService } from 'jslib-common/abstractions/vaultTimeout.service';

import { StorageKey } from 'jslib-common/enums/storageKey';

const IdleInterval = 60 * 5; // 5 minutes

export default class IdleBackground {
    private idle: any;
    private idleTimer: number = null;
    private idleState = 'active';

    constructor(private vaultTimeoutService: VaultTimeoutService, private activeAccount: ActiveAccountService,
        private notificationsService: NotificationsService) {
        this.idle = chrome.idle || (browser != null ? browser.idle : null);
    }

    async init() {
        if (!this.idle) {
            return;
        }

        const idleHandler = (newState: string) => {
            if (newState === 'active') {
                this.notificationsService.reconnectFromActivity();
            } else {
                this.notificationsService.disconnectFromInactivity();
            }
        };
        if (this.idle.onStateChanged && this.idle.setDetectionInterval) {
            this.idle.setDetectionInterval(IdleInterval);
            this.idle.onStateChanged.addListener(idleHandler);
        } else {
            this.pollIdle(idleHandler);
        }

        if (this.idle.onStateChanged) {
            this.idle.onStateChanged.addListener(async (newState: string) => {
                if (newState === 'locked') { // If the screen is locked or the screensaver activates
                    const timeout = await this.activeAccount.getInformation<number>(StorageKey.VaultTimeout);
                    if (timeout === -2) { // On System Lock vault timeout option
                        const action = await this.activeAccount.getInformation<string>(StorageKey.VaultTimeoutAction);
                        if (action === 'logOut') {
                            await this.vaultTimeoutService.logOut();
                        } else {
                            await this.vaultTimeoutService.lock(true);
                        }
                    }
                }
            });
        }
    }

    private pollIdle(handler: (newState: string) => void) {
        if (this.idleTimer != null) {
            window.clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
        this.idle.queryState(IdleInterval, (state: string) => {
            if (state !== this.idleState) {
                this.idleState = state;
                handler(state);
            }
            this.idleTimer = window.setTimeout(() => this.pollIdle(handler), 5000);
        });
    }
}
