import { useState } from 'react';
import { Button, Modal, Typography, Link, CircularProgress } from '@mui/material';
import { TonConnectButton, useTonAddress, useTonConnectUI, CHAIN } from '@tonconnect/ui-react';
import { beginCell } from '@ton/core';

const API_KEY = "54a18b0c12fe257cb935941d3367a61263e651a1a5324b08931760cb0ec7fab9";
const API_URL = "https://testnet.toncenter.com/api/v2";
const POLL_INTERVAL = 5000;
const TIMEOUT = 15000;

async function getTransactionHash(base64Boc) {
  try {
    const response = await fetch(`${API_URL}/sendBocReturnHash`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ boc: base64Boc })
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.error);

    console.log('Transaction Hash:', data.result.hash);
    return data.result.hash;
  } catch (error) {
    console.error('Failed to get transaction hash:', error);
    throw error;
  }
}

async function checkTransactionStatus(address, txHash) {
  try {
    const rawAddress = address.replace(/^UQ/, '0:');
    const encodedAddress = encodeURIComponent(rawAddress);
    const encodedHash = encodeURIComponent(txHash);

    const response = await fetch(
      `${API_URL}/getTransactions?address=${encodedAddress}&hash=${encodedHash}&archival=true`,
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.ok && data.result.length > 0;
  } catch (error) {
    console.error('Error checking transaction:', error);
    return false;
  }
}

async function waitTransactionConfirmation(address, txHash, timeout) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const isConfirmed = await checkTransactionStatus(address, txHash);
      if (isConfirmed) {
        console.log('Transaction confirmed with hash:', txHash);
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    } catch (error) {
      console.error('Error while waiting for confirmation:', error);
    }
  }

  throw new Error('Transaction confirmation timeout');
}

function App() {
  const address = useTonAddress();
  const [status, setStatus] = useState('idle');
  const [txInfo, setTxInfo] = useState(null);
  const [error, setError] = useState('');
  const [tonConnectUI] = useTonConnectUI();

  const comment = "danya";
  const payload = beginCell()
    .storeUint(0, 32) 
    .storeStringTail(comment) 
    .endCell();

  const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 360,
    messages: [
      {
        address: 'UQAVTL7RMlNBvSAsNB_LDEIGHGzFnQCem9itMJ595z08xRiB',
        amount: '90000',
        payload: payload.toBoc().toString("base64") 
      },
      {
        address: 'UQBWXQfaNKxYC3YwbMeL806pT8V4o0Ctc_u3gvd5YsbQFgLz',
        amount: '90000',
        payload: payload.toBoc().toString("base64") 
      }
    ]
  };

  const handleClick = async (e) => {
    e.preventDefault();
    try {
      setStatus('sending');

      if (!tonConnectUI.connected || tonConnectUI.account?.chain !== CHAIN.TESTNET) {
        throw new Error('Please connect a TESTNET wallet');
      }

      const result = await tonConnectUI.sendTransaction(transaction);

      if (!result?.boc) {
        throw new Error('The transaction was not sent');
      }

      setStatus('waiting-confirmation');

      const txHash = await getTransactionHash(result.boc);

      setTimeout(async () => {
        try {
          const isConfirmed = await checkTransactionStatus(address, txHash);
          if (isConfirmed) {
            setTxInfo({
              hash: txHash,
              amount: transaction.messages.reduce((sum, msg) => sum + Number(msg.amount), 0) / 1e9
            });
            setStatus('confirmed');
          } else {
            setError('Transaction not confirmed within 30 seconds');
            setStatus('error');
          }
        } catch (error) {
          setError(error.message);
          setStatus('error');
        }
      }, TIMEOUT);

    } catch (error) {
      setError(error.message);
      setStatus('error');
    }
  };

  const resetState = () => {
    setStatus('idle');
    setTxInfo(null);
    setError('');
  };

  return (
    <div className="app">
      <Modal open={status !== 'idle'} onClose={resetState}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          backgroundColor: 'white',
          padding: 24,
          borderRadius: 8,
          textAlign: 'center'
        }}>
          {status === 'sending' && (
            <>
              <CircularProgress />
              <Typography mt={2}>Sending transaction...</Typography>
            </>
          )}

          {status === 'waiting-confirmation' && (
            <>
              <CircularProgress />
              <Typography mt={2}>Waiting for confirmation...</Typography>
              <Typography variant="body2" mt={1}>
                This usually takes 5-30 seconds
              </Typography>
            </>
          )}

          {status === 'confirmed' && txInfo && (
            <>
              <Typography variant="h6" color="success.main">
                ✅ Transaction confirmed!
              </Typography>
              {txInfo.hash && (
                <Link
                  href={`https://testnet.tonviewer.com/transaction/${txInfo.hash}`}
                  target="_blank"
                  display="block"
                  mt={2}
                >
                  Open in viewer
                </Link>
              )}
              <Typography mt={2}>Sum: {txInfo.amount} TON</Typography>
              <Button
                variant="contained"
                onClick={resetState}
                sx={{ mt: 3 }}
              >
                Close
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <Typography color="error.main">❌ Error: {error}</Typography>
              <Button
                variant="contained"
                onClick={resetState}
                sx={{ mt: 3 }}
              >
                Close
              </Button>
            </>
          )}
        </div>
      </Modal>

      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: 24,
        textAlign: 'center'
      }}>
        <TonConnectButton />

        {address && (
          <Button
            variant="contained"
            onClick={handleClick}
            disabled={status !== 'idle'}
            sx={{ mt: 3 }}
          >
            Send Transaction
          </Button>
        )}
      </div>
    </div>
  );
}

export default App;
