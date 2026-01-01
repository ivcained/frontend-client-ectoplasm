import React from 'react';
import { useWallet } from '../hooks/useWallet';
import { useDex } from '../contexts/DexContext';

export const Header: React.FC<{ wallet: ReturnType<typeof useWallet> }> = ({ wallet }) => {
    const { config } = useDex();

    return (
        <header style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h1>Ectoplasm DEX</h1>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                    Network: {config.chainName} | Node: {config.nodeUrl}
                </div>
            </div>
            <div>
                {!wallet.isConnected ? (
                    <button onClick={wallet.connect} disabled={wallet.isConnecting}>
                        {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </button>
                ) : (
                    <div>
                        <span style={{ marginRight: '1rem', fontWeight: 'bold' }}>
                            {wallet.activeKey?.slice(0, 10)}...{wallet.activeKey?.slice(-5)}
                        </span>
                        <span>Connected</span>
                    </div>
                )}
            </div>
        </header>
    );
};
