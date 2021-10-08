import {
    Component,
    OnInit,
} from '@angular/core';

import { StorageKey } from 'jslib-common/enums/storageKey';
import { ThemeType } from 'jslib-common/enums/themeType';
import { UriMatchType } from 'jslib-common/enums/uriMatchType';

import { ActiveAccountService } from 'jslib-common/abstractions/activeAccount.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { MessagingService } from 'jslib-common/abstractions/messaging.service';
import { TotpService } from 'jslib-common/abstractions/totp.service';

@Component({
    selector: 'app-options',
    templateUrl: 'options.component.html',
})
export class OptionsComponent implements OnInit {
    disableFavicon = false;
    disableBadgeCounter = false;
    enableAutoFillOnPageLoad = false;
    autoFillOnPageLoadDefault = false;
    autoFillOnPageLoadOptions: any[];
    disableAutoTotpCopy = false;
    disableContextMenuItem = false;
    disableAddLoginNotification = false;
    disableChangedPasswordNotification = false;
    dontShowCards = false;
    dontShowIdentities = false;
    showClearClipboard = true;
    theme: string;
    themeOptions: any[];
    defaultUriMatch = UriMatchType.Domain;
    uriMatchOptions: any[];
    clearClipboard: number;
    clearClipboardOptions: any[];
    showGeneral: boolean = true;
    showAutofill: boolean = true;
    showDisplay: boolean = true;

    constructor(private messagingService: MessagingService, private activeAccount: ActiveAccountService,
        private totpService: TotpService, i18nService: I18nService) {
        this.themeOptions = [
            { name: i18nService.t('default'), value: null },
            { name: i18nService.t('light'), value: ThemeType.Light },
            { name: i18nService.t('dark'), value: ThemeType.Dark },
            { name: 'Nord', value: ThemeType.Nord },
            { name: i18nService.t('solarizedDark'), value: ThemeType.SolarizedDark },
        ];
        this.uriMatchOptions = [
            { name: i18nService.t('baseDomain'), value: UriMatchType.Domain },
            { name: i18nService.t('host'), value: UriMatchType.Host },
            { name: i18nService.t('startsWith'), value: UriMatchType.StartsWith },
            { name: i18nService.t('regEx'), value: UriMatchType.RegularExpression },
            { name: i18nService.t('exact'), value: UriMatchType.Exact },
            { name: i18nService.t('never'), value: UriMatchType.Never },
        ];
        this.clearClipboardOptions = [
            { name: i18nService.t('never'), value: null },
            { name: i18nService.t('tenSeconds'), value: 10 },
            { name: i18nService.t('twentySeconds'), value: 20 },
            { name: i18nService.t('thirtySeconds'), value: 30 },
            { name: i18nService.t('oneMinute'), value: 60 },
            { name: i18nService.t('twoMinutes'), value: 120 },
            { name: i18nService.t('fiveMinutes'), value: 300 },
        ];
        this.autoFillOnPageLoadOptions = [
            { name: i18nService.t('autoFillOnPageLoadYes'), value: true },
            { name: i18nService.t('autoFillOnPageLoadNo'), value: false },
        ];
    }

    async ngOnInit() {
        this.enableAutoFillOnPageLoad = await this.activeAccount.getInformation<boolean>(
            StorageKey.EnableAutoFillOnPageLoad);

        this.autoFillOnPageLoadDefault = await this.activeAccount.getInformation<boolean>(
            StorageKey.AutoFillOnPageLoadDefault) ?? true;

        this.disableAddLoginNotification = await this.activeAccount.getInformation<boolean>(
            StorageKey.DisableAddLoginNotification);

        this.disableChangedPasswordNotification = await this.activeAccount.getInformation<boolean>(
            StorageKey.DisableChangedPasswordNotification);

        this.disableContextMenuItem = await this.activeAccount.getInformation<boolean>(
            StorageKey.DisableContextMenuItem);

        this.dontShowCards = await this.activeAccount.getInformation<boolean>(StorageKey.DontShowCardsCurrentTab);
        this.dontShowIdentities = await this.activeAccount.getInformation<boolean>(StorageKey.DontShowIdentitiesCurrentTab);

        this.disableAutoTotpCopy = !(await this.totpService.isAutoCopyEnabled());

        this.disableFavicon = await this.activeAccount.getInformation<boolean>(StorageKey.DisableFavicon);

        this.disableBadgeCounter = await this.activeAccount.getInformation<boolean>(StorageKey.DisableBadgeCounter);

        this.theme = await this.activeAccount.getInformation<string>(StorageKey.Theme);

        const defaultUriMatch = await this.activeAccount.getInformation<UriMatchType>(StorageKey.DefaultUriMatch);
        this.defaultUriMatch = defaultUriMatch == null ? UriMatchType.Domain : defaultUriMatch;

        this.clearClipboard = await this.activeAccount.getInformation<number>(StorageKey.ClearClipboard);
    }

    async updateAddLoginNotification() {
        await this.activeAccount.saveInformation(StorageKey.DisableAddLoginNotification,
            this.disableAddLoginNotification);
    }

    async updateChangedPasswordNotification() {
        await this.activeAccount.saveInformation(StorageKey.DisableChangedPasswordNotification,
            this.disableChangedPasswordNotification);
    }

    async updateDisableContextMenuItem() {
        await this.activeAccount.saveInformation(StorageKey.DisableContextMenuItem,
            this.disableContextMenuItem);
        this.messagingService.send('bgUpdateContextMenu');
    }

    async updateAutoTotpCopy() {
        await this.activeAccount.saveInformation(StorageKey.DisableAutoTotpCopy, this.disableAutoTotpCopy);
    }

    async updateAutoFillOnPageLoad() {
        await this.activeAccount.saveInformation(StorageKey.EnableAutoFillOnPageLoad, this.enableAutoFillOnPageLoad);
    }

    async updateAutoFillOnPageLoadDefault() {
        await this.activeAccount.saveInformation(StorageKey.AutoFillOnPageLoadDefault, this.autoFillOnPageLoadDefault);
    }

    async updateDisableFavicon() {
        await this.activeAccount.saveInformation(StorageKey.DisableFavicon, this.disableFavicon);
    }

    async updateDisableBadgeCounter() {
        await this.activeAccount.saveInformation(StorageKey.DisableBadgeCounter, this.disableBadgeCounter);
        this.messagingService.send('bgUpdateContextMenu');
    }

    async updateShowCards() {
        await this.activeAccount.saveInformation(StorageKey.DontShowCardsCurrentTab, this.dontShowCards);
    }

    async updateShowIdentities() {
        await this.activeAccount.saveInformation(StorageKey.DontShowIdentitiesCurrentTab, this.dontShowIdentities);
    }

    async saveTheme() {
        await this.activeAccount.saveInformation(StorageKey.Theme, this.theme);
        window.setTimeout(() => window.location.reload(), 200);
    }

    async saveDefaultUriMatch() {
        await this.activeAccount.saveInformation(StorageKey.DefaultUriMatch, this.defaultUriMatch);
    }

    async saveClearClipboard() {
        await this.activeAccount.saveInformation(StorageKey.ClearClipboard, this.clearClipboard);
    }
}
