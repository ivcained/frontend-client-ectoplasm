import React, { useState } from 'react';
import sdk from 'casper-js-sdk';
import { useDex } from '../contexts/DexContext';
import { useWallet } from '../hooks/useWallet';

const { Deploy } = (sdk as any).default ?? sdk;

interface Props {
    wallet: ReturnType<typeof useWallet>;
    log: (msg: string) => void;
}

export const Approve: React.FC<Props> = ({ wallet, log }) => {
    const { dex, config } = useDex();
    const [token, setToken] = useState<'WCSPR' | 'ECTO'>('WCSPR');
    const [amount, setAmount] = useState('1000');
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        if (!wallet.activeKey || !wallet.publicKey) {
            alert('Connect Wallet first');
            return;
        }
        setLoading(true);
        try {
            const decimals = config.tokens[token].decimals;
            const amountBI = BigInt(parseFloat(amount) * (10 ** decimals));
            const tokenHash = config.tokens[token].packageHash;
            const spender = config.routerContractHash;

            log(`Approving ${amount} ${token} for Router...`);
            const deploy = dex.makeApproveTokenDeploy(
                tokenHash,
                spender,
                amountBI,
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
            log(`Approve Sent! Hash: ${txHash}`);
        } catch (e: any) {
            log(`Error: ${e.message}`);
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h2>Approve Router</h2>
            <div className="form-group">
                <label>Token</label>
                <select value={token} onChange={(e) => setToken(e.target.value as any)}>
                    <option value="WCSPR">WCSPR</option>
                    <option value="ECTO">ECTO</option>
                </select>
            </div>
            <div className="form-group">
                <label>Amount</label>
                <input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                />
            </div>
            <button onClick={handleApprove} disabled={loading}>
                {loading ? 'Approving...' : 'Approve'}
            </button>
        </div>
    );
};
