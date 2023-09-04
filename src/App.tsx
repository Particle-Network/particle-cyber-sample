import { CyberAccount, CyberBundler, CyberPaymaster } from '@cyberlab/cyber-account';
import { isValidAddress } from '@ethereumjs/util';
import {
    Base,
    BaseGoerli,
    Linea,
    LineaGoerli,
    Optimism,
    OptimismGoerli,
    Polygon,
    PolygonMumbai,
    chains,
} from '@particle-network/chains';
import { useRequest } from 'ahooks';
import { Button, Card, Input, InputNumber, Select, message } from 'antd';
import { ethers, parseUnits, toBigInt } from 'ethers';
import { useEffect, useMemo, useState } from 'react';
import './App.scss';
import useParticle from './Particle';
import generateJwt from './jwt';

function App() {
    const { particle, connect, disconnect, provider, connected, currentChain, switchChain } = useParticle();

    const [sendValue, setSendValue] = useState<number>(0.001);
    const [receiverAddress, setReceiverAddress] = useState<string>();

    const [sendERC20Value, setSendERC20Value] = useState<number>(0.001);
    const [receiverERC20Address, setReceiverERC20Address] = useState<string>();
    const [erc20ContractAddress, setERC20ContractAddress] = useState<string>();

    const [balance, setBalance] = useState('0');
    const [accountDeployed, setAccountDeployed] = useState(false);

    const cyberAccount = useMemo(() => {
        if (!particle || !provider || !connected) {
            return;
        }
        const cyberBundler = new CyberBundler({
            rpcUrl: 'https://api.stg.cyberconnect.dev/cyberaccount/bundler/v1/rpc',
            appId: '87fffd6e-3b60-45ea-8562-2c05151d3404',
        });
        const ownerAddress = particle.auth.getWallet()?.public_address;
        const sign = async (message: string): Promise<any> => {
            return await particle.evm.personalSign(message);
        };

        // Optional: Paymaster
        const cyberPaymaster = new CyberPaymaster({
            rpcUrl: 'https://api.stg.cyberconnect.dev/cyberaccount/paymaster/v1/rpc',
            appId: '87fffd6e-3b60-45ea-8562-2c05151d3404',
            generateJwt: async (cyberAccountAddress) => generateJwt(cyberAccountAddress),
        });

        const cyberAccount = new CyberAccount({
            chain: {
                id: currentChain.id,
                testnet: currentChain.network !== 'Mainnet',
            },
            owner: {
                address: ownerAddress as any,
                signMessage: sign,
            },
            bundler: cyberBundler,
            paymaster: cyberPaymaster,
        });
        return cyberAccount;
    }, [particle, provider, connected, currentChain]);

    const onSendValueChange = (value: number | null) => {
        setSendValue(Number(value));
    };

    const sendNativeToken = () => {
        if (sendValue <= 0 || !cyberAccount || !receiverAddress) {
            return Promise.reject('Invalid params');
        }
        if (!isValidAddress(receiverAddress)) {
            return Promise.reject('Invalid receiver address');
        }

        return cyberAccount!.sendTransaction({
            to: receiverAddress as any,
            value: parseUnits(sendValue.toString(), 18) as any,
            data: '0x',
        });
    };

    const { run: runSendNativeToken, loading: sendNativeTokenLoading } = useRequest(sendNativeToken, {
        manual: true,
        onSuccess: (hash) => {
            console.log('sendNativeToken', hash);
        },
        onError: (e) => {
            console.error('sendNativeToken', e);
            message.error(e.message ?? e);
        },
    });

    const sendERC20Token = () => {
        if (sendERC20Value <= 0 || !cyberAccount || !receiverERC20Address || !erc20ContractAddress) {
            return Promise.reject('Invalid params');
        }
        if (!isValidAddress(receiverERC20Address)) {
            return Promise.reject('Invalid receiver address');
        }
        if (!isValidAddress(erc20ContractAddress)) {
            return Promise.reject('Invalid contract address');
        }

        const erc20Interface = new ethers.Interface(['function transfer(address _to, uint256 _value)']);
        // Encode an ERC-20 token transfer to recipient of the specified amount
        const data = erc20Interface.encodeFunctionData('transfer', [
            receiverERC20Address,
            ethers.parseEther(sendERC20Value.toString()).toString(),
        ]);
        return cyberAccount!.sendTransaction({
            to: erc20ContractAddress as any,
            data: data as any,
            value: toBigInt(0),
        });
    };

    const { run: runSendERC20Token, loading: sendERC20TokenLoading } = useRequest(sendERC20Token, {
        manual: true,
        onSuccess: (hash) => {
            console.log('sendERC20Token', hash);
        },
        onError: (e) => {
            console.error('sendERC20Token', e);
            message.error(e.message ?? e);
        },
    });

    const handleSwitchChain = async (value: string) => {
        const chainId = Number(value);
        const chainInfo = chains.getEVMChainInfoById(chainId);
        if (chainInfo) {
            await switchChain(chainInfo);
        }
    };

    useEffect(() => {
        if (provider && cyberAccount) {
            provider
                .getBalance(cyberAccount.address)
                .then((result) => {
                    setBalance(ethers.formatEther(result));
                })
                .catch((e) => console.error('getBalance', e));
        }
    }, [provider, cyberAccount]);

    useEffect(() => {
        if (cyberAccount) {
            cyberAccount
                .isAccountDeployed()
                .then((result) => {
                    setAccountDeployed(result);
                })
                .catch((e) => console.error('isAccountDeployed', e));
        }
    }, [cyberAccount]);

    return (
        <div className="app">
            <div className="title">Particle ❤️ Cyber</div>
            <div className="top-menu">
                <Select
                    className="connect-chain"
                    defaultValue="420"
                    onChange={handleSwitchChain}
                    options={[
                        Optimism,
                        OptimismGoerli,
                        Polygon,
                        PolygonMumbai,
                        Base,
                        BaseGoerli,
                        Linea,
                        LineaGoerli,
                    ].map((chain) => {
                        return {
                            value: chain.id.toString(),
                            label: chain.fullname,
                        };
                    })}
                />

                <Button
                    className="btn-connect"
                    type="primary"
                    onClick={() => {
                        if (particle?.auth.isLogin()) {
                            disconnect().catch((e) => console.log('disconnect', e));
                        } else {
                            connect().catch((e) => console.log('connect', e));
                        }
                    }}
                >
                    {connected ? 'Disconnect' : 'Connect'}
                </Button>
            </div>

            {!cyberAccount && <div className="experience-more">Connect Particle to experience more features</div>}

            {cyberAccount && (
                <>
                    <Card title="Wallet Info" className="card">
                        <div>{`Smart Account: ${cyberAccount.address}`}</div>
                        <div>{`Balance: ${balance}`}</div>
                        <div>{`Account Deployed: ${accountDeployed}`}</div>
                    </Card>

                    <Card title="Send Native Token" className="card">
                        <Input
                            style={{ width: '100%' }}
                            placeholder="Receiver address"
                            onChange={(e) => setReceiverAddress(e.target.value)}
                        ></Input>
                        <InputNumber
                            style={{ width: '100%', marginTop: 16 }}
                            defaultValue={sendValue}
                            placeholder="amount"
                            min={0.000001}
                            max={100000}
                            onChange={onSendValueChange}
                        />
                        <Button
                            type="primary"
                            style={{ width: '100%', marginTop: 16 }}
                            onClick={runSendNativeToken}
                            loading={sendNativeTokenLoading}
                        >
                            Send
                        </Button>
                    </Card>

                    <Card title="Send ERC-20 Token" className="card">
                        <Input
                            style={{ width: '100%' }}
                            placeholder="Contract address"
                            onChange={(e) => setERC20ContractAddress(e.target.value)}
                        ></Input>
                        <Input
                            style={{ width: '100%', marginTop: 16 }}
                            placeholder="Receiver address"
                            onChange={(e) => setReceiverERC20Address(e.target.value)}
                        ></Input>
                        <InputNumber
                            style={{ width: '100%', marginTop: 16 }}
                            defaultValue={sendERC20Value}
                            placeholder="amount"
                            min={0.000001}
                            max={100000}
                            onChange={(value: number | null) => setSendERC20Value(Number(value))}
                        />
                        <Button
                            type="primary"
                            style={{ width: '100%', marginTop: 16 }}
                            onClick={runSendERC20Token}
                            loading={sendERC20TokenLoading}
                        >
                            Send
                        </Button>
                    </Card>
                </>
            )}
        </div>
    );
}

export default App;
