import { useState, useEffect, useCallback } from 'react';
import sdk from 'casper-js-sdk';

// Using SDK defaults safely
const { PublicKey, Deploy } = (sdk as any).default ?? sdk;

export interface WalletState {
    isConnected: boolean;
    activeKey: string | null;
    publicKey: any | null; // sdk.PublicKey
    isConnecting: boolean;
}

export function useWallet() {
    const [state, setState] = useState<WalletState>({
        isConnected: false,
        activeKey: null,
        publicKey: null,
        isConnecting: false,
    });

    const checkConnection = useCallback(async () => {
        const provider = window.CasperWalletProvider ? window.CasperWalletProvider() : null;
        if (!provider) return;

        try {
            const isConnected = await provider.isConnected();
            if (isConnected) {
                const activeKey = await provider.getActivePublicKey();
                setState(prev => ({
                    ...prev,
                    isConnected: true,
                    activeKey,
                    publicKey: PublicKey.fromHex(activeKey),
                }));
            }
        } catch (e) {
            console.error("Connection check failed:", e);
        }
    }, []);

    useEffect(() => {
        checkConnection();
        // Optional: Listen for lock/unlock events if provider supports it
    }, [checkConnection]);

    const connect = async () => {
        const provider = window.CasperWalletProvider ? window.CasperWalletProvider() : null;
        if (!provider) {
            alert("Casper Wallet not found!");
            return;
        }

        setState(prev => ({ ...prev, isConnecting: true }));
        try {
            const connected = await provider.requestConnection();
            if (connected) {
                const activeKey = await provider.getActivePublicKey();
                setState({
                    isConnected: true,
                    activeKey,
                    publicKey: PublicKey.fromHex(activeKey),
                    isConnecting: false,
                });
            } else {
                setState(prev => ({ ...prev, isConnecting: false }));
            }
        } catch (e) {
            console.error(e);
            setState(prev => ({ ...prev, isConnecting: false }));
        }
    };

    const sign = async (deploy: any) => {
        const provider = window.CasperWalletProvider ? window.CasperWalletProvider() : null;
        if (!provider || !state.activeKey) throw new Error("Wallet not connected");

        const deployJson = Deploy.toJSON(deploy);
        const result = await provider.sign(JSON.stringify(deployJson), state.activeKey);

        if (result.cancelled) throw new Error("Sign cancelled");

        // Ensure signature is hex string
        let signature = result.signature;
        if (typeof signature === 'object') {
            const bytes = Object.values(signature);
            signature = bytes.map((b: any) => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
        }

        // Fix: Prepend algorithm tag if missing (Node expects 01/02 prefix)
        // Casper signatures are usually 64 bytes (128 hex). Tagged are 65 bytes (130 hex).
        if (signature.length === 128 && state.activeKey) {
            const algoTag = state.activeKey.substring(0, 2);
            signature = algoTag + signature;
        }

        return signature;
    };

    return { ...state, connect, sign };
}
