import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const KhaltiCallback = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('Verifying your payment...');

    useEffect(() => {
        const verifyPayment = async () => {
            const queryParams = new URLSearchParams(location.search);
            const pidx = queryParams.get('pidx');
            const transaction_id = queryParams.get('transaction_id');
            const status_from_url = queryParams.get('status');

            if (!pidx) {
                setStatus('error');
                setMessage('Invalid payment session.');
                return;
            }

            if (status_from_url === 'User canceled') {
                setStatus('error');
                setMessage('Payment was canceled by the user.');
                return;
            }

            try {
                const response = await axios.post('http://localhost:5000/api/payments/verify', { pidx });

                if (response.data.success) {
                    setStatus('success');
                    setMessage('Payment successful! Your booking has been confirmed.');
                    // Redirect to dashboard after 3 seconds
                    setTimeout(() => {
                        navigate('/guest/dashboard', { state: { activeTab: 'bookings' } });
                    }, 3000);
                } else {
                    setStatus('error');
                    setMessage(response.data.message || 'Payment verification failed.');
                }
            } catch (error) {
                console.error('Verification error details:', error.response?.data || error.message);
                setStatus('error');
                const serverError = error.response?.data?.message || error.response?.data?.error || error.message;
                setMessage(`Verification failed: ${serverError}`);
            }
        };

        verifyPayment();
    }, [location, navigate]);

    return (
        <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center p-4 font-['Space_Grotesk']">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border border-white">
                {status === 'verifying' && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 border-4 border-[#607AFB] border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <h2 className="text-2xl font-bold text-slate-900">Verifying Payment</h2>
                        <p className="text-slate-600">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6 animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                            <span className="material-symbols-outlined text-4xl font-bold">check_circle</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Payment Successful!</h2>
                        <p className="text-slate-600">{message}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Your digital bill is now available in your dashboard.</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => navigate('/guest/dashboard', { state: { activeTab: 'bookings' } })}
                                className="w-full py-4 bg-[#607AFB] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-[#607AFB]/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                View My Receipt
                            </button>
                            <button
                                onClick={() => navigate('/guest/dashboard')}
                                className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                            >
                                Back to Home
                            </button>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6 animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                            <span className="material-symbols-outlined text-4xl font-bold">error</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Payment Failed</h2>
                        <p className="text-slate-600">{message}</p>
                        <button
                            onClick={() => navigate('/guest/dashboard')}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </div>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
            `}</style>
        </div>
    );
};

export default KhaltiCallback;
