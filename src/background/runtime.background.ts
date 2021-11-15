import { EnvironmentService } from 'jslib-common/abstractions/environment.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { LogService } from 'jslib-common/abstractions/log.service';
import { MessagingService } from 'jslib-common/abstractions/messaging.service';
import { NotificationsService } from 'jslib-common/abstractions/notifications.service';
import { StorageService } from 'jslib-common/abstractions/storage.service';
import { SystemService } from 'jslib-common/abstractions/system.service';
import { VaultTimeoutService } from 'jslib-common/abstractions/vaultTimeout.service';

import { AutofillService } from '../services/abstractions/autofill.service';
import BrowserPlatformUtilsService from '../services/browserPlatformUtils.service';

import { BrowserApi } from '../browser/browserApi';

import MainBackground from './main.background';

import { Utils } from 'jslib-common/misc/utils';

import { PolicyType } from 'jslib-common/enums/policyType';
import { StateService } from 'jslib-common/abstractions/state.service';
import LockedVaultPendingNotificationsItem from './models/lockedVaultPendingNotificationsItem';
import { CipherService } from 'jslib-common/abstractions/cipher.service';
import { PolicyService } from 'jslib-common/abstractions/policy.service';
import { FolderService } from 'jslib-common/abstractions/folder.service';
import { LoginView } from 'jslib-common/models/view/loginView';
import { LoginUriView } from 'jslib-common/models/view/loginUriView';
import { CipherView } from 'jslib-common/models/view/cipherView';
import { CipherType } from 'jslib-common/enums/cipherType';

export default class RuntimeBackground {
    private autofillTimeout: any;
    private pageDetailsToAutoFill: any[] = [];
    private onInstalledReason: string = null;
    private lockedVaultPendingNotifications: LockedVaultPendingNotificationsItem[] = [];

    constructor(private main: MainBackground, private autofillService: AutofillService,
        private cipherService: CipherService, private platformUtilsService: BrowserPlatformUtilsService,
        private i18nService: I18nService,
        private notificationsService: NotificationsService, private systemService: SystemService,
        private vaultTimeoutService: VaultTimeoutService, private environmentService: EnvironmentService,
        private policyService: PolicyService, private messagingService: MessagingService,
        private folderService: FolderService, private stateService: StateService, private logService: LogService) {

        // onInstalled listener must be wired up before anything else, so we do it in the ctor
        chrome.runtime.onInstalled.addListener((details: any) => {
            this.onInstalledReason = details.reason;
        });
    }

    async init() {
        if (!chrome.runtime) {
            return;
        }

        await this.checkOnInstalled();
        BrowserApi.messageListener('runtime.background', async (msg: any, sender: chrome.runtime.MessageSender, sendResponse: any) => {
            await this.processMessage(msg, sender, sendResponse);
        });
    }

    async processMessage(msg: any, sender: any, sendResponse: any) {
        switch (msg.command) {
            case 'loggedIn':
            case 'unlocked':
                let item: LockedVaultPendingNotificationsItem;

                if (this.lockedVaultPendingNotifications.length > 0) {
                    await BrowserApi.closeLoginTab();

                    item = this.lockedVaultPendingNotifications.pop();
                    if (item.commandToRetry.sender?.tab?.id) {
                        await BrowserApi.focusSpecifiedTab(item.commandToRetry.sender.tab.id);
                    }
                }

                await this.main.setIcon();
                await this.main.refreshBadgeAndMenu(false);
                this.notificationsService.updateConnection(msg.command === 'unlocked');
                this.systemService.cancelProcessReload();

                if (item) {
                    await BrowserApi.tabSendMessageData(item.commandToRetry.sender.tab, 'unlockCompleted', item);
                }
                break;
            case 'addToLockedVaultPendingNotifications':
                this.lockedVaultPendingNotifications.push(msg.data);
                break;
            case 'logout':
                await this.main.logout(msg.expired);
                break;
            case 'syncCompleted':
                if (msg.successfully) {
                    setTimeout(async () => await this.main.refreshBadgeAndMenu(), 2000);
                }
                break;
            case 'openPopup':
                await this.main.openPopup();
                break;
            case 'promptForLogin':
                await BrowserApi.createNewTab('popup/index.html?uilocation=popout', true, true);
                break;
            case 'showDialogResolve':
                this.platformUtilsService.resolveDialogPromise(msg.dialogId, msg.confirmed);
                break;
            case 'bgCollectPageDetails':
                await this.main.collectPageDetailsForContentScript(sender.tab, msg.sender, sender.frameId);
                break;
            case 'bgUpdateContextMenu':
            case 'editedCipher':
            case 'addedCipher':
            case 'deletedCipher':
                await this.main.refreshBadgeAndMenu();
                break;
            case 'bgReseedStorage':
                await this.main.reseedStorage();
                break;
            case 'collectPageDetailsResponse':
                switch (msg.sender) {
                    case 'autofiller':
                    case 'autofill_cmd':
                        const totpCode = await this.autofillService.doAutoFillActiveTab([{
                            frameId: sender.frameId,
                            tab: msg.tab,
                            details: msg.details,
                        }], msg.sender === 'autofill_cmd');
                        if (totpCode != null) {
                            this.platformUtilsService.copyToClipboard(totpCode, { window: window });
                        }
                        break;
                    case 'contextMenu':
                        clearTimeout(this.autofillTimeout);
                        this.pageDetailsToAutoFill.push({
                            frameId: sender.frameId,
                            tab: msg.tab,
                            details: msg.details,
                        });
                        this.autofillTimeout = setTimeout(async () => await this.autofillPage(), 300);
                        break;
                    default:
                        break;
                }
                break;
            case 'authResult':
                const vaultUrl = this.environmentService.getWebVaultUrl();

                if (msg.referrer == null || Utils.getHostname(vaultUrl) !== msg.referrer) {
                    return;
                }

                try {
                    BrowserApi.createNewTab('popup/index.html?uilocation=popout#/sso?code=' +
                        encodeURIComponent(msg.code) + '&state=' + encodeURIComponent(msg.state));
                }
                catch {
                    this.logService.error('Unable to open sso popout tab');
                }
                break;
            case 'webAuthnResult':
                const vaultUrl2 = this.environmentService.getWebVaultUrl();

                if (msg.referrer == null || Utils.getHostname(vaultUrl2) !== msg.referrer) {
                    return;
                }

                const params = `webAuthnResponse=${encodeURIComponent(msg.data)};` +
                    `remember=${encodeURIComponent(msg.remember)}`;
                BrowserApi.createNewTab(`popup/index.html?uilocation=popout#/2fa;${params}`, undefined, false);
                break;
            case 'reloadPopup':
                this.messagingService.send('reloadPopup');
                break;
            case 'emailVerificationRequired':
                this.messagingService.send('showDialog', {
                    dialogId: 'emailVerificationRequired',
                    title: this.i18nService.t('emailVerificationRequired'),
                    text: this.i18nService.t('emailVerificationRequiredDesc'),
                    confirmText: this.i18nService.t('ok'),
                    type: 'info',
                });
                break;
            case 'getClickedElementResponse':
                this.platformUtilsService.copyToClipboard(msg.identifier, { window: window });
            default:
                break;
        }
    }

    private async autofillPage() {
        const totpCode = await this.autofillService.doAutoFill({
            cipher: this.main.loginToAutoFill,
            pageDetails: this.pageDetailsToAutoFill,
            fillNewPassword: true,
        });

        if (totpCode != null) {
            this.platformUtilsService.copyToClipboard(totpCode, { window: window });
        }

        // reset
        this.main.loginToAutoFill = null;
        this.pageDetailsToAutoFill = [];
    }

    private async saveAddLogin(tab: any, folderId: string) {
        if (await this.vaultTimeoutService.isLocked()) {
            return;
        }

        for (let i = this.main.notificationQueue.length - 1; i >= 0; i--) {
            const queueMessage = this.main.notificationQueue[i];
            if (queueMessage.tabId !== tab.id || queueMessage.type !== 'addLogin') {
                continue;
            }

            const tabDomain = Utils.getDomain(tab.url);
            if (tabDomain != null && tabDomain !== queueMessage.domain) {
                continue;
            }

            this.main.notificationQueue.splice(i, 1);
            BrowserApi.tabSendMessageData(tab, 'closeNotificationBar');

            const loginModel = new LoginView();
            const loginUri = new LoginUriView();
            loginUri.uri = queueMessage.uri;
            loginModel.uris = [loginUri];
            loginModel.username = queueMessage.username;
            loginModel.password = queueMessage.password;
            const model = new CipherView();
            model.name = Utils.getHostname(queueMessage.uri) || queueMessage.domain;
            model.name = model.name.replace(/^www\./, '');
            model.type = CipherType.Login;
            model.login = loginModel;

            if (!Utils.isNullOrWhitespace(folderId)) {
                const folders = await this.folderService.getAllDecrypted();
                if (folders.some(x => x.id === folderId)) {
                    model.folderId = folderId;
                }
            }

            const cipher = await this.cipherService.encrypt(model);
            await this.cipherService.saveWithServer(cipher);
        }
    }

    private async saveChangePassword(tab: any) {
        if (await this.vaultTimeoutService.isLocked()) {
            return;
        }

        for (let i = this.main.notificationQueue.length - 1; i >= 0; i--) {
            const queueMessage = this.main.notificationQueue[i];
            if (queueMessage.tabId !== tab.id || queueMessage.type !== 'changePassword') {
                continue;
            }

            const tabDomain = Utils.getDomain(tab.url);
            if (tabDomain != null && tabDomain !== queueMessage.domain) {
                continue;
            }

            this.main.notificationQueue.splice(i, 1);
            BrowserApi.tabSendMessageData(tab, 'closeNotificationBar');

            const cipher = await this.cipherService.get(queueMessage.cipherId);
            if (cipher != null && cipher.type === CipherType.Login) {
                const model = await cipher.decrypt();
                model.login.password = queueMessage.newPassword;
                const newCipher = await this.cipherService.encrypt(model);
                await this.cipherService.saveWithServer(newCipher);
            }
        }
    }

    private async saveNever(tab: any) {
        for (let i = this.main.notificationQueue.length - 1; i >= 0; i--) {
            const queueMessage = this.main.notificationQueue[i];
            if (queueMessage.tabId !== tab.id || queueMessage.type !== 'addLogin') {
                continue;
            }

            const tabDomain = Utils.getDomain(tab.url);
            if (tabDomain != null && tabDomain !== queueMessage.domain) {
                continue;
            }

            this.main.notificationQueue.splice(i, 1);
            BrowserApi.tabSendMessageData(tab, 'closeNotificationBar');

            const hostname = Utils.getHostname(tab.url);
            await this.cipherService.saveNeverDomain(hostname);
        }
    }

    private async addLogin(loginInfo: any, tab: any) {
        if (await this.vaultTimeoutService.isLocked()) {
            return;
        }

        const loginDomain = Utils.getDomain(loginInfo.url);
        if (loginDomain == null) {
            return;
        }

        let normalizedUsername = loginInfo.username;
        if (normalizedUsername != null) {
            normalizedUsername = normalizedUsername.toLowerCase();
        }

        const ciphers = await this.cipherService.getAllDecryptedForUrl(loginInfo.url);
        const usernameMatches = ciphers.filter(c =>
            c.login.username != null && c.login.username.toLowerCase() === normalizedUsername);
        if (usernameMatches.length === 0) {
            const disabledAddLogin = await this.stateService.getDisableAddLoginNotification();
            if (disabledAddLogin) {
                return;
            }

            if (!(await this.allowPersonalOwnership())) {
                return;
            }

            // remove any old messages for this tab
            this.removeTabFromNotificationQueue(tab);
            this.main.notificationQueue.push({
                type: 'addLogin',
                username: loginInfo.username,
                password: loginInfo.password,
                domain: loginDomain,
                uri: loginInfo.url,
                tabId: tab.id,
                expires: new Date((new Date()).getTime() + 30 * 60000), // 30 minutes
            });
            await this.main.checkNotificationQueue(tab);
        } else if (usernameMatches.length === 1 && usernameMatches[0].login.password !== loginInfo.password) {
            const disabledChangePassword = await this.stateService.getDisableChangedPasswordNotification();
            if (disabledChangePassword) {
                return;
            }
            this.addChangedPasswordToQueue(usernameMatches[0].id, loginDomain, loginInfo.password, tab);
        }
    }

    private async changedPassword(changeData: any, tab: any) {
        if (await this.vaultTimeoutService.isLocked()) {
            return;
        }

        const loginDomain = Utils.getDomain(changeData.url);
        if (loginDomain == null) {
            return;
        }

        let id: string = null;
        const ciphers = await this.cipherService.getAllDecryptedForUrl(changeData.url);
        if (changeData.currentPassword != null) {
            const passwordMatches = ciphers.filter(c => c.login.password === changeData.currentPassword);
            if (passwordMatches.length === 1) {
                id = passwordMatches[0].id;
            }
        } else if (ciphers.length === 1) {
            id = ciphers[0].id;
        }
        if (id != null) {
            this.addChangedPasswordToQueue(id, loginDomain, changeData.newPassword, tab);
        }
    }

    private async addChangedPasswordToQueue(cipherId: string, loginDomain: string, newPassword: string, tab: any) {
        // remove any old messages for this tab
        this.removeTabFromNotificationQueue(tab);
        this.main.notificationQueue.push({
            type: 'changePassword',
            cipherId: cipherId,
            newPassword: newPassword,
            domain: loginDomain,
            tabId: tab.id,
            expires: new Date((new Date()).getTime() + 30 * 60000), // 30 minutes
        });
        await this.main.checkNotificationQueue(tab);
    }

    private removeTabFromNotificationQueue(tab: any) {
        for (let i = this.main.notificationQueue.length - 1; i >= 0; i--) {
            if (this.main.notificationQueue[i].tabId === tab.id) {
                this.main.notificationQueue.splice(i, 1);
            }
        }
    }

    private async checkOnInstalled() {
        setTimeout(async () => {
            if (this.onInstalledReason != null) {
                if (this.onInstalledReason === 'install') {
                    BrowserApi.createNewTab('https://bitwarden.com/browser-start/');
                    await this.setDefaultSettings();
                }

                this.onInstalledReason = null;
            }
        }, 100);
    }

    private async setDefaultSettings() {
        // Default timeout option to "on restart".
        const currentVaultTimeout = await this.stateService.getVaultTimeout();
        if (currentVaultTimeout == null) {
            //      await this.stateService.setVaultTimeout(-1);
        }

        // Default action to "lock".
        const currentVaultTimeoutAction = await this.stateService.getVaultTimeoutAction();
        if (currentVaultTimeoutAction == null) {
            //      await this.stateService.setVaultTimeoutAction('lock');
        }
    }

    private async getDataForTab(tab: any, responseCommand: string) {
        const responseData: any = {};
        if (responseCommand === 'notificationBarDataResponse') {
            responseData.neverDomains = await this.stateService.getNeverDomains();
            const disableAddLoginFromOptions = await this.stateService.getDisableAddLoginNotification();
            responseData.disabledAddLoginNotification = disableAddLoginFromOptions || !(await this.allowPersonalOwnership());
            responseData.disabledChangedPasswordNotification = await this.stateService.getDisableChangedPasswordNotification();
        } else if (responseCommand === 'autofillerAutofillOnPageLoadEnabledResponse') {
            responseData.autofillEnabled = await this.stateService.getEnableAutoFillOnPageLoad();
        } else if (responseCommand === 'notificationBarFrameDataResponse') {
            responseData.i18n = {
                appName: this.i18nService.t('appName'),
                close: this.i18nService.t('close'),
                yes: this.i18nService.t('yes'),
                never: this.i18nService.t('never'),
                notificationAddSave: this.i18nService.t('notificationAddSave'),
                notificationNeverSave: this.i18nService.t('notificationNeverSave'),
                notificationAddDesc: this.i18nService.t('notificationAddDesc'),
                notificationChangeSave: this.i18nService.t('notificationChangeSave'),
                notificationChangeDesc: this.i18nService.t('notificationChangeDesc'),
            };
        } else if (responseCommand === 'notificationBarGetFoldersList') {
            responseData.folders = await this.folderService.getAllDecrypted();
        }

        await BrowserApi.tabSendMessageData(tab, responseCommand, responseData);
    }

    private async allowPersonalOwnership(): Promise<boolean> {
        return !await this.policyService.policyAppliesToUser(PolicyType.PersonalOwnership);
    }
}
