/// <reference types="vite/client" />

interface Window {
    CasperWalletProvider?: () => {
        requestConnection: () => Promise<boolean>;
        isConnected: () => Promise<boolean>;
        getActivePublicKey: () => Promise<string>;
        sign: (deployJson: string, publicKey: string) => Promise<{ cancelled: boolean; signature: string }>;
    };
}
