import React, { useState } from 'react';
import sdk from 'casper-js-sdk';
import { useDex } from '../contexts/DexContext';
import { useWallet } from '../hooks/useWallet';

const { Deploy } = (sdk as any).default ?? sdk;

interface Props {
    wallet: ReturnType<typeof useWallet>;
    log: (msg: string) => void;
}

export const Swap: React.FC<Props> = ({ wallet, log }) => {
    const { dex, config } = useDex();
    const [amountIn, setAmountIn] = useState('10');
    const [amountOutMin, setAmountOutMin] = useState('0');
    const [loading, setLoading] = useState(false);

    const handleSwap = async () => {
        if (!wallet.publicKey) return;
        setLoading(true);
        try {
            const amtInBI = BigInt(parseFloat(amountIn) * 1e9);
            const amtOutMinBI = BigInt(parseFloat(amountOutMin) * 1e18);

            log(`Swapping ${amountIn} WCSPR -> ECTO...`);
            const deploy = dex.makeSwapExactTokensForTokensDeploy(
                amtInBI,
                amtOutMinBI,
                [config.tokens.WCSPR.packageHash, config.tokens.ECTO.packageHash],
                `account-hash-${wallet.publicKey.accountHash().toHex()}`,
                Date.now() + 1800000,
                wallet.publicKey
            );

             log('Requesting signature...');
            const signature = await wallet.sign(deploy);
            log(`Signed! Signature: ${signature.slice(0, 20)}...`);

            // Use JSON payload
            const deployJson = Deploy.toJSON(deploy);
            const approval = { 
                signer: wallet.publicKey.toHex(), 
                signature 
            };
            if (!deployJson.approvals) deployJson.approvals = [];
            deployJson.approvals.push(approval);

            log('Broadcasting JSON...');
            const txHash = await dex.sendDeployRaw(deployJson);
            log(`Swap Sent! Hash: ${txHash}`);
        } catch (e: any) {
             log(`Error: ${e.message}`);
             console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h2>Swap WCSPR to ECTO</h2>
            <div className="form-group">
                <label>WCSPR Amount (In)</label>
                <input type="number" value={amountIn} onChange={e => setAmountIn(e.target.value)} />
            </div>
            <div className="form-group">
                <label>ECTO Amount (Out Min)</label>
                <input type="number" value={amountOutMin} onChange={e => setAmountOutMin(e.target.value)} />
            </div>
            <button onClick={handleSwap} disabled={loading}>{loading ? 'Swapping...' : 'Swap'}</button>
        </div>
    );
};
