import { KeySuffixOptions } from 'jslib-common/enums/keySuffixOptions';
import { Utils } from 'jslib-common/misc/utils';
import { SymmetricCryptoKey } from 'jslib-common/models/domain/symmetricCryptoKey';

import { CryptoService } from 'jslib-common/services/crypto.service';

export class BrowserCryptoService extends CryptoService {
    protected async retrieveKeyFromStorage(keySuffix: KeySuffixOptions) {
        if (keySuffix === 'biometric') {
            await this.platformUtilService.authenticateBiometric();
            return new SymmetricCryptoKey(Utils.fromB64ToArray((await this.getKey())?.keyB64).buffer);
        }

        return await super.retrieveKeyFromStorage(keySuffix);
    }
}
