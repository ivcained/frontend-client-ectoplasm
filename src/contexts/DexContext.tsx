import React, { createContext, useContext, useState } from 'react';
import { DexClient, type DexConfig } from '../dex-client';

// Configuration from Environment Variables
const CONFIG: DexConfig = {
    nodeUrl: import.meta.env.VITE_NODE_ADDRESS || '',
    chainName: import.meta.env.VITE_CHAIN_NAME || '',
    routerPackageHash: import.meta.env.VITE_ROUTER_PACKAGE_HASH || '',
    routerContractHash: import.meta.env.VITE_ROUTER_CONTRACT_HASH || '',
    factoryHash: import.meta.env.VITE_FACTORY_CONTRACT_HASH || '',
    tokens: {
        WCSPR: {
            packageHash: import.meta.env.VITE_WCSPR_PACKAGE_HASH || '',
            contractHash: import.meta.env.VITE_WCSPR_CONTRACT_HASH || '',
            decimals: 9,
        },
        ECTO: {
            packageHash: import.meta.env.VITE_ECTO_PACKAGE_HASH || '',
            contractHash: import.meta.env.VITE_ECTO_CONTRACT_HASH || '',
            decimals: 18,
        },
    },
    pairs: {
        'WCSPR-ECTO': 'dynamic', // Placeholder
    }
};

interface DexContextType {
    dex: DexClient;
    config: DexConfig;
}

const DexContext = createContext<DexContextType | null>(null);

export const DexProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dex] = useState(() => new DexClient(CONFIG));

    return (
        <DexContext.Provider value={{ dex, config: CONFIG }}>
            {children}
        </DexContext.Provider>
    );
};

export const useDex = () => {
    const context = useContext(DexContext);
    if (!context) throw new Error("useDex must be used within DexProvider");
    return context;
};
