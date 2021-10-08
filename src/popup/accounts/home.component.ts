import { Component } from '@angular/core';

import { ActiveAccountService } from 'jslib-common/abstractions/activeAccount.service';
import { CryptoFunctionService } from 'jslib-common/abstractions/cryptoFunction.service';
import { EnvironmentService } from 'jslib-common/abstractions/environment.service';
import { PasswordGenerationService } from 'jslib-common/abstractions/passwordGeneration.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';

import { Utils } from 'jslib-common/misc/utils';

import { StorageKey } from 'jslib-common/enums/storageKey';

@Component({
    selector: 'app-home',
    templateUrl: 'home.component.html',
})
export class HomeComponent {
    constructor(protected platformUtilsService: PlatformUtilsService,
        private passwordGenerationService: PasswordGenerationService, private activeAccount: ActiveAccountService,
        private cryptoFunctionService: CryptoFunctionService, private environmentService: EnvironmentService) { }

    async launchSsoBrowser() {
        // Generate necessary sso params
        const passwordOptions: any = {
            type: 'password',
            length: 64,
            uppercase: true,
            lowercase: true,
            numbers: true,
            special: false,
        };

        const state = (await this.passwordGenerationService.generatePassword(passwordOptions)) + ':clientId=browser';
        const codeVerifier = await this.passwordGenerationService.generatePassword(passwordOptions);
        const codeVerifierHash = await this.cryptoFunctionService.hash(codeVerifier, 'sha256');
        const codeChallenge = Utils.fromBufferToUrlB64(codeVerifierHash);

        await this.activeAccount.saveInformation(StorageKey.SsoCodeVerifier, codeVerifier);
        await this.activeAccount.saveInformation(StorageKey.SsoState, state);

        let url = this.environmentService.getWebVaultUrl();
        if (url == null) {
            url = 'https://vault.bitwarden.com';
        }

        const redirectUri = url + '/sso-connector.html';

        // Launch browser
        this.platformUtilsService.launchUri(url + '/#/sso?clientId=browser' +
            '&redirectUri=' + encodeURIComponent(redirectUri) +
            '&state=' + state + '&codeChallenge=' + codeChallenge);
    }
}
