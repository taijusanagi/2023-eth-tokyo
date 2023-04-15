import { UserOperationStruct } from '@account-abstraction/contracts';

import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { BigNumber, ethers } from 'ethers';
import React, { useCallback, useState } from 'react';
import {
  AccountImplementations,
  ActiveAccountImplementation,
} from '../../../App/constants';
import {
  useBackgroundDispatch,
  useBackgroundSelector,
} from '../../../App/hooks';
import {
  getAccountInfo,
  getActiveAccount,
} from '../../../Background/redux-slices/selectors/accountSelectors';
import { selectCurrentOriginPermission } from '../../../Background/redux-slices/selectors/dappPermissionSelectors';
import { getActiveNetwork } from '../../../Background/redux-slices/selectors/networkSelectors';
import {
  selectCurrentPendingSendTransactionRequest,
  selectCurrentPendingSendTransactionUserOp,
} from '../../../Background/redux-slices/selectors/transactionsSelectors';
import {
  createUnsignedUserOp,
  rejectTransaction,
  sendTransaction,
  setUnsignedUserOperation,
} from '../../../Background/redux-slices/transactions';
import { EthersTransactionRequest } from '../../../Background/services/types';
import AccountInfo from '../../components/account-info';
import OriginInfo from '../../components/origin-info';
import Config from '../../../../exconfig';
import AuthWorldCoin from '../../components/worldcoin-integrate/auth-worldcoin';
import GetCredentialPolygonID from '../../components/polygonid-integrate';

const SignTransactionComponent =
  AccountImplementations[ActiveAccountImplementation].Transaction;

const SignTransactionConfirmation = ({
  activeNetwork,
  activeAccount,
  accountInfo,
  originPermission,
  transactions,
  userOp,
  onReject,
  onSend,
}: {
  activeNetwork: any;
  activeAccount: any;
  accountInfo: any;
  originPermission: any;
  transactions: EthersTransactionRequest[];
  userOp: UserOperationStruct;
  onReject: any;
  onSend: any;
}) => {
  const [showAddPaymasterUI, setShowAddPaymasterUI] = useState<boolean>(false);
  const [addPaymasterLoader, setAddPaymasterLoader] = useState<boolean>(false);
  const [paymasterError, setPaymasterError] = useState<string>('');

  const [credential, setCredential] = useState<any>();
  const [paymasterUrl, setPaymasterUrl] = useState<string>('');
  const backgroundDispatch = useBackgroundDispatch();

  const addPaymasterForWorldCoin = useCallback(async (credential: any) => {
    console.log('addPaymasterForWorldCoin');

    const signal = "0x50f4c3dD6958a9f8267dA4Ded7446632F5C28D4f"

    const proofHexString = credential.proof.slice(2)
    const chunkSize = proofHexString.length / 8;
    const proofChunks = [];
    for (let i = 0; i < proofHexString.length; i += chunkSize) {
      proofChunks.push(proofHexString.slice(i, i + chunkSize));
    }
    const proof = proofChunks.map((chunk) => ethers.BigNumber.from("0x" + chunk));
    const worldcoinData = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256", "uint256", "uint256[8]"],
      [signal, credential.merkle_root, credential.nullifier_hash, proof]
    );
    const data = ethers.utils.defaultAbiCoder.encode(
      ["uint8", "bytes"],
      [0, worldcoinData]
    );

    // const simplePaymaster = "0x333153c3B1180070E1CC0c77a910D96061d9B553"
    const paymasterAddress = "0x396DC1582617bc24A38500DCE88D844BC1ab13e8"
    const paymasterAndData = "0x" + paymasterAddress.replace("0x", "") + data.replace("0x", "");
    console.log("paymasterAndData", paymasterAndData)
    console.log("worldcoinData", worldcoinData)
    backgroundDispatch(
      setUnsignedUserOperation({
      ...userOp,
      paymasterAndData,
      preVerificationGas: 1000000,
      verificationGasLimit: 1000000,
    }))

    // setAddPaymasterLoader(true);
    // if (paymasterUrl) {
    //   const paymasterRPC = new ethers.providers.JsonRpcProvider(paymasterUrl, {
    //     name: 'Paymaster',
    //     chainId: parseInt(activeNetwork.chainID),
    //   });
    //   try {
    //     const paymasterResp = await paymasterRPC.send(
    //       'eth_getPaymasterAndDataSize',
    //       [userOp]
    //     );
    //     backgroundDispatch(
    //       setUnsignedUserOperation({
    //         ...userOp,
    //         paymasterAndData: paymasterResp,
    //         verificationGasLimit: paymasterResp.verificationGasLimit,
    //       })
    //     );
    //   } catch (e) {
    //     console.log(e);
    //     setPaymasterError('Paymaster url returned error');
    //   }
    //   setAddPaymasterLoader(false);
    // }
  }, [activeNetwork.chainID, backgroundDispatch, credential, userOp]);
  // }, [activeNetwork.chainID, backgroundDispatch, paymasterUrl, userOp]);

  return (
    <Container>
      <Box sx={{ p: 2 }}>
        <Typography textAlign="center" variant="h6">
          Send transaction request
        </Typography>
      </Box>
      {activeAccount && (
        <AccountInfo activeAccount={activeAccount} accountInfo={accountInfo} />
      )}
      <Stack spacing={2} sx={{ position: 'relative', pt: 2, mb: 4 }}>
        <OriginInfo permission={originPermission} />
        <Typography variant="h6" sx-={{ p: 2 }}>
          Attach Credential for Sponsored Tx
        </Typography>
        <Paper sx={{ p: 2 }}>
          <AuthWorldCoin
            onSuccess={(result) => {
              addPaymasterForWorldCoin(result)
            }}
          />
          <GetCredentialPolygonID />
        </Paper>
        {/* {!showAddPaymasterUI && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2">
              {userOp.paymasterAndData === '0x'
                ? 'No paymaster has been used'
                : ';'}
            </Typography>
            <Button onClick={() => setShowAddPaymasterUI(true)} variant="text">
              Add custom
            </Button>
          </Paper>
        )}
        {showAddPaymasterUI && (
          <Paper sx={{ p: 2 }}>
            <TextField
              value={paymasterUrl}
              onChange={(e) => setPaymasterUrl(e.target.value)}
              sx={{ width: '100%' }}
              label="Paymaster URL"
              variant="standard"
            />
            {paymasterError}
            <Box
              justifyContent="space-around"
              alignItems="center"
              display="flex"
              sx={{ p: '16px 0px' }}
            >
              <Button
                sx={{ width: 150 }}
                variant="outlined"
                onClick={() => {
                  setShowAddPaymasterUI(false);
                  setAddPaymasterLoader(false);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={addPaymasterLoader}
                sx={{ width: 150, position: 'relative' }}
                variant="contained"
                onClick={addPaymaster}
              >
                Add
                {addPaymasterLoader && (
                  <CircularProgress
                    size={24}
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      marginTop: '-12px',
                      marginLeft: '-12px',
                    }}
                  />
                )}
              </Button>
            </Box>
          </Paper>
        )} */}
        <Typography variant="h6" sx-={{ p: 2 }}>
          {transactions.length > 1 ? ' Transactions data' : 'Transaction data'}
        </Typography>
        <Stack spacing={2}>
          {transactions.map((transaction: EthersTransactionRequest, index) => (
            <Paper key={index} sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                To:{' '}
                <Typography component="span" variant="body2">
                  {transaction.to}
                </Typography>
              </Typography>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Data:{' '}
                <Typography component="span" variant="body2">
                  {transaction.data?.toString()}
                </Typography>
              </Typography>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Value:{' '}
                <Typography component="span" variant="body2">
                  {transaction.value
                    ? ethers.utils.formatEther(transaction.value)
                    : 0}{' '}
                  {activeNetwork.baseAsset.symbol}
                </Typography>
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Stack>
      {!showAddPaymasterUI && (
        <Paper
          elevation={3}
          sx={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            width: '100%',
          }}
        >
          <Box
            justifyContent="space-around"
            alignItems="center"
            display="flex"
            sx={{ p: 2 }}
          >
            <Button sx={{ width: 150 }} variant="outlined" onClick={onReject}>
              Reject
            </Button>
            <Button
              sx={{ width: 150 }}
              variant="contained"
              onClick={() => onSend()}
            >
              Send
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

const SignTransactionRequest = () => {
  const [stage, setStage] = useState<
    'custom-account-screen' | 'sign-transaction-confirmation'
  >('custom-account-screen');

  const [context, setContext] = useState(null);

  const backgroundDispatch = useBackgroundDispatch();
  const activeAccount = useBackgroundSelector(getActiveAccount);
  const activeNetwork = useBackgroundSelector(getActiveNetwork);
  const accountInfo = useBackgroundSelector((state) =>
    getAccountInfo(state, activeAccount)
  );

  const sendTransactionRequest = useBackgroundSelector(
    selectCurrentPendingSendTransactionRequest
  );

  const pendingUserOp = useBackgroundSelector(
    selectCurrentPendingSendTransactionUserOp
  );

  const originPermission = useBackgroundSelector((state) =>
    selectCurrentOriginPermission(state, {
      origin: sendTransactionRequest?.origin || '',
      address: activeAccount || '',
    })
  );

  const onSend = useCallback(
    async (_context?: any) => {
      if (activeAccount)
        await backgroundDispatch(
          sendTransaction({
            address: activeAccount,
            context: _context || context,
          })
        );
      window.close();
    },
    [activeAccount, backgroundDispatch, context]
  );

  const onComplete = useCallback(
    async (modifiedTransaction: EthersTransactionRequest, context?: any) => {
      if (activeAccount) {
        backgroundDispatch(createUnsignedUserOp(activeAccount));
        setContext(context);
        if (Config.showTransactionConfirmationScreen === false) {
          onSend(context);
        }
        setStage('sign-transaction-confirmation');
      }
    },
    [setContext, setStage, activeAccount, backgroundDispatch, onSend]
  );

  const onReject = useCallback(async () => {
    if (activeAccount)
      await backgroundDispatch(rejectTransaction(activeAccount));
    window.close();
  }, [backgroundDispatch, activeAccount]);

  if (
    stage === 'sign-transaction-confirmation' &&
    pendingUserOp &&
    sendTransactionRequest.transactionRequest
  )
    return (
      <SignTransactionConfirmation
        activeNetwork={activeNetwork}
        activeAccount={activeAccount}
        accountInfo={accountInfo}
        originPermission={originPermission}
        onReject={onReject}
        onSend={onSend}
        transactions={[sendTransactionRequest.transactionRequest]}
        userOp={pendingUserOp}
      />
    );

  return SignTransactionComponent &&
    sendTransactionRequest.transactionRequest ? (
    <SignTransactionComponent
      onReject={onReject}
      transaction={sendTransactionRequest.transactionRequest}
      onComplete={onComplete}
    />
  ) : null;
};

export default SignTransactionRequest;
