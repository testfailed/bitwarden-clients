import { Component } from '@angular/core';
import {
    ActivatedRoute,
    Router,
} from '@angular/router';

import { CipherService } from 'jslib-common/abstractions/cipher.service';
import { CollectionService } from 'jslib-common/abstractions/collection.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { OrganizationService } from 'jslib-common/abstractions/organization.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';

import { ShareComponent as BaseShareComponent } from 'jslib-angular/components/share.component';
import { LogService } from 'jslib-common/abstractions/log.service';

@Component({
    selector: 'app-vault-share',
    templateUrl: 'share.component.html',
})
export class ShareComponent extends BaseShareComponent {
    constructor(collectionService: CollectionService, platformUtilsService: PlatformUtilsService,
        i18nService: I18nService, logService: LogService,
        cipherService: CipherService, private route: ActivatedRoute,
        private router: Router, organizationService: OrganizationService) {
        super(collectionService, platformUtilsService, i18nService, cipherService,
            logService, organizationService);
    }

    async ngOnInit() {
        this.onSharedCipher.subscribe(() => {
            this.router.navigate(['view-cipher', { cipherId: this.cipherId }]);
        });
        const queryParamsSub = this.route.queryParams.subscribe(async params => {
            this.cipherId = params.cipherId;
            await this.load();
            if (queryParamsSub != null) {
                queryParamsSub.unsubscribe();
            }
        });
    }

    async submit(): Promise<boolean> {
        const success = await super.submit();
        if (success) {
            this.cancel();
        }
        return success;
    }

    cancel() {
        this.router.navigate(['/view-cipher'], { replaceUrl: true, queryParams: { cipherId: this.cipher.id } });
    }
}
