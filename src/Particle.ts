import { ParticleNetwork, type LoginOptions } from '@particle-network/auth';
import {
    Base,
    BaseGoerli,
    Linea,
    LineaGoerli,
    Optimism,
    OptimismGoerli,
    Polygon,
    PolygonMumbai,
    type ChainInfo,
} from '@particle-network/chains';
import { ParticleProvider } from '@particle-network/provider';
import { ethers } from 'ethers';
import { useCallback, useEffect, useMemo, useState } from 'react';

const useParticle = () => {
    const [particle, setParticle] = useState<ParticleNetwork>();
    const [connected, setConnected] = useState<boolean>();
    const [currentChain, setCurrentChain] = useState<ChainInfo>(OptimismGoerli);

    useEffect(() => {
        const pn = initParticle();
        const onConnect = () => {
            setConnected(true);
        };
        const onDisconnect = () => {
            setConnected(false);
        };
        pn.auth.on('connect', onConnect);
        pn.auth.on('disconnect', onDisconnect);
        return () => {
            pn.auth.removeListener('connect', onConnect);
            pn.auth.removeListener('disconnect', onDisconnect);
        };
    }, []);

    const initParticle = () => {
        const particle = new ParticleNetwork({
            projectId: '34c6b829-5b89-44e8-90a9-6d982787b9c9',
            clientKey: 'c6Z44Ml4TQeNhctvwYgdSv6DBzfjf6t6CB0JDscR',
            appId: '64f36641-b68c-4b19-aa10-5c5304d0eab3',
            chainName: OptimismGoerli.name,
            chainId: OptimismGoerli.id,
            wallet: {
                customStyle: {
                    supportChains: [
                        Optimism,
                        OptimismGoerli,
                        Polygon,
                        PolygonMumbai,
                        Base,
                        BaseGoerli,
                        Linea,
                        LineaGoerli,
                    ],
                },
            },
        });
        particle.setLanguage('en-US');
        setParticle(particle);
        setConnected(particle.auth.isLogin());
        return particle;
    };

    const connect = useCallback(
        async (config?: LoginOptions) => {
            if (particle) {
                return particle.auth.login(config);
            } else {
                return Promise.reject('particle is not ready');
            }
        },
        [particle]
    );

    const disconnect = useCallback(() => {
        if (particle) {
            return particle.auth.logout();
        } else {
            return Promise.reject('particle is not ready');
        }
    }, [particle]);

    const provider = useMemo(() => {
        if (particle) {
            return new ethers.BrowserProvider(new ParticleProvider(particle.auth), 'any');
        }
    }, [particle]);

    const switchChain = async (chain: ChainInfo) => {
        await particle?.switchChain(chain, true);
        setCurrentChain(chain);
    };

    return {
        particle,
        connect,
        disconnect,
        provider,
        connected,
        switchChain,
        currentChain,
    };
};

export default useParticle;
