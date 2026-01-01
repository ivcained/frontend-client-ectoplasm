import React, { useEffect, useRef } from 'react';

export const LogViewer: React.FC<{ logs: string[] }> = ({ logs }) => {
    const preRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (preRef.current) {
            preRef.current.scrollTop = preRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#1a1a1a', borderRadius: '12px', border: '1px solid #333' }}>
            <h3 style={{ color: '#fff' }}>Logs</h3>
            <pre 
                ref={preRef}
                style={{ height: '200px', overflowY: 'auto', background: '#0f0f0f', padding: '0.8rem', borderRadius: '6px', color: '#0f0' }}
            >
                {logs.map((log, i) => <div key={i}>{log}</div>)}
            </pre>
        </div>
    );
};
