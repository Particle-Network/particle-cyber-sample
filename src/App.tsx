import { RedoOutlined } from '@ant-design/icons';
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
import { Button, Card, Input, InputNumber, Select, Switch, message, notification } from 'antd';
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
    const [usePaymaster, setUsePaymaster] = useState(true);

    const cyberBundler = useMemo(
        () =>
            new CyberBundler({
                rpcUrl: 'https://api.stg.cyberconnect.dev/cyberaccount/bundler/v1/rpc',
                appId: '87fffd6e-3b60-45ea-8562-2c05151d3404',
            }),
        []
    );

    const cyberPaymaster = useMemo(
        () =>
            new CyberPaymaster({
                rpcUrl: 'https://api.stg.cyberconnect.dev/cyberaccount/paymaster/v1/rpc',
                appId: '87fffd6e-3b60-45ea-8562-2c05151d3404',
                generateJwt: async (cyberAccountAddress) => generateJwt(cyberAccountAddress),
            }),
        []
    );

    const cyberAccount = useMemo(() => {
        if (!particle || !provider || !connected) {
            return;
        }
        const ownerAddress = particle.auth.getWallet()?.public_address;
        const sign = async (message: string): Promise<any> => {
            return await particle.evm.personalSign(message);
        };

        const cyberAccount = new CyberAccount({
            chain: {
                id: currentChain.id,
                testnet: currentChain.network !== 'Mainnet',
                rpcUrl: currentChain.rpcUrl,
            },
            owner: {
                address: ownerAddress as any,
                signMessage: sign,
            },
            bundler: cyberBundler,
            paymaster: usePaymaster ? cyberPaymaster : undefined,
        });
        return cyberAccount;
    }, [particle, provider, connected, currentChain, cyberBundler, cyberPaymaster, usePaymaster]);

    const onSendValueChange = (value: number | null) => {
        setSendValue(Number(value));
    };

    const sendNativeToken = async () => {
        if (sendValue <= 0 || !cyberAccount || !receiverAddress) {
            return Promise.reject('Invalid params');
        }
        if (!isValidAddress(receiverAddress)) {
            return Promise.reject('Invalid receiver address');
        }

        const hash = await cyberAccount!.sendTransaction({
            to: receiverAddress as any,
            value: parseUnits(sendValue.toString(), 18) as any,
            data: '0x',
        });

        let txHash;
        while (!txHash) {
            // delay 3000
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const result = await cyberBundler.getUserOperationByHash(hash!);
            if (result) {
                txHash = result.transactionHash;
            }
        }
        return txHash;
    };

    const { run: runSendNativeToken, loading: sendNativeTokenLoading } = useRequest(sendNativeToken, {
        manual: true,
        onSuccess: (hash) => {
            console.log('sendNativeToken, transactionHash', hash);
            notification.success({
                message: 'Send Native Token Success',
                description: hash,
                onClick: () => {
                    window.open(`${currentChain.blockExplorerUrl}/tx/${hash}`, '_blank');
                },
            });
            if (cyberAccount) {
                runGetBalance(cyberAccount.address);
                setAccountDeployed(true);
            }
        },
        onError: (e) => {
            console.error('sendNativeToken', e);
            message.error(e.message ?? e);
        },
    });

    const sendERC20Token = async () => {
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
        const hash = await cyberAccount!.sendTransaction({
            to: erc20ContractAddress as any,
            data: data as any,
            value: toBigInt(0),
        });

        let txHash;
        while (!txHash) {
            // delay 3000
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const result = await cyberBundler.getUserOperationByHash(hash!);
            if (result) {
                txHash = result.transactionHash;
            }
        }
        return txHash;
    };

    const { run: runSendERC20Token, loading: sendERC20TokenLoading } = useRequest(sendERC20Token, {
        manual: true,
        onSuccess: (hash) => {
            console.log('sendERC20Token, transactionHash', hash);
            if (hash) {
                notification.success({
                    message: 'Send ERC20 Token Success',
                    description: hash,
                    onClick: () => {
                        window.open(`${currentChain.blockExplorerUrl}/tx/${hash}`, '_blank');
                    },
                });
            }
            if (cyberAccount) {
                runGetBalance(cyberAccount.address);
                setAccountDeployed(true);
            }
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

    const getBalance = async (address: string) => {
        if (provider) {
            return provider.getBalance(address);
        }
    };

    const { run: runGetBalance, loading: getBalanceLoading } = useRequest(getBalance, {
        onSuccess: (result) => {
            if (result !== undefined) {
                setBalance(ethers.formatEther(result));
            }
        },
        onError: (e) => {
            console.error('getBalance', e);
        },
    });

    useEffect(() => {
        if (provider && cyberAccount) {
            runGetBalance(cyberAccount.address);
        }
    }, [provider, cyberAccount]);

    const getAccountDeployed = async () => {
        if (cyberAccount) {
            return cyberAccount.isAccountDeployed();
        }
    };

    const { run: runGetAccountDeployed, loading: getAccountDeployedLoading } = useRequest(getAccountDeployed, {
        onSuccess: (result) => {
            setAccountDeployed(result ?? false);
        },
        onError: (e) => {
            console.error('isAccountDeployed', e);
        },
    });

    useEffect(() => {
        if (cyberAccount) {
            runGetAccountDeployed();
        }
    }, [cyberAccount]);

    return (
        <div className="app">
            <div className="title">Particle ❤️ Cyber Connect</div>
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
                        <div>{`Cyber Account: ${cyberAccount.address}`}</div>
                        <div>
                            {`Balance: ${balance}`}
                            <RedoOutlined
                                style={{ color: '#1677ff', marginLeft: 10, fontSize: 15 }}
                                spin={getBalanceLoading}
                                onClick={() => runGetBalance(cyberAccount.address)}
                            />
                        </div>
                        <div>
                            {`Account Deployed: ${accountDeployed}`}
                            <RedoOutlined
                                style={{ color: '#1677ff', marginLeft: 10, fontSize: 15 }}
                                spin={getAccountDeployedLoading}
                                onClick={runGetAccountDeployed}
                            />
                        </div>
                        <div>
                            Use Paymaster:
                            <Switch
                                style={{ position: 'absolute', right: 24 }}
                                checked={usePaymaster}
                                onChange={(checked) => setUsePaymaster(checked)}
                            ></Switch>
                        </div>
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
