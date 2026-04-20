import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const ListYourHotelPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F3EF] text-[#2D3748] font-sans antialiased flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="flex-1">
        <section className="relative w-full overflow-hidden min-h-[500px] flex items-center bg-gradient-to-b from-[#1B2B41] via-[#243B5A] to-[#162338]">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 right-20 w-96 h-96 bg-[#B88E2F] rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 left-20 w-80 h-80 bg-[#B88E2F] rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-24 text-center">
            <p className="text-[12px] font-bold text-[#E3C987] uppercase tracking-[0.35em] mb-4">Partner Program</p>
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
              List Your Hotel & Grow Your Business
            </h1>
            <p className="text-lg text-[#C4D0DF] max-w-2xl mx-auto leading-relaxed mb-8">
              Join Nepal Stay's verified network of properties. Reach guests directly, manage bookings easily, and increase your revenue with our all-in-one platform.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl p-6 border border-[#E8E4DE] shadow-sm">
                <div className="w-12 h-12 bg-[#F3E6C4] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-[#B88E2F] text-xl">trending_up</span>
                </div>
                <h3 className="text-[#1B2B41] font-bold mb-2">Increase Bookings</h3>
                <p className="text-[#64748B] text-sm">Direct access to thousands of guests searching for quality accommodations.</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-[#E8E4DE] shadow-sm">
                <div className="w-12 h-12 bg-[#F3E6C4] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-[#B88E2F] text-xl">manage_accounts</span>
                </div>
                <h3 className="text-[#1B2B41] font-bold mb-2">Easy Management</h3>
                <p className="text-[#64748B] text-sm">Manage reservations, availability, and pricing from one intuitive dashboard.</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-[#E8E4DE] shadow-sm">
                <div className="w-12 h-12 bg-[#F3E6C4] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-[#B88E2F] text-xl">verified_user</span>
                </div>
                <h3 className="text-[#1B2B41] font-bold mb-2">Verified & Trusted</h3>
                <p className="text-[#64748B] text-sm">Build trust with verified guest reviews and secure payment processing.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl font-bold text-[#1B2B41] text-center mb-16">How It Works</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#B88E2F] text-white font-bold flex items-center justify-center shrink-0 text-lg">1</div>
                  <h3 className="text-xl font-bold text-[#1B2B41]">Fill Your Info</h3>
                </div>
                <p className="text-[#64748B] leading-relaxed">
                  Submit your hotel details, contact information, and property description in our simple form.
                </p>
              </div>

              <div className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#B88E2F] text-white font-bold flex items-center justify-center shrink-0 text-lg">2</div>
                  <h3 className="text-xl font-bold text-[#1B2B41]">Add Rooms</h3>
                </div>
                <p className="text-[#64748B] leading-relaxed">
                  Define room categories, set pricing, and list your physical rooms with details.
                </p>
              </div>

              <div className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#B88E2F] text-white font-bold flex items-center justify-center shrink-0 text-lg">3</div>
                  <h3 className="text-xl font-bold text-[#1B2B41]">Get Verified</h3>
                </div>
                <p className="text-[#64748B] leading-relaxed">
                  Our team reviews your submission and activates your property within 48 hours.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-[#FAF8F5] border-t border-[#E8E4DE]">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-[#1B2B41] mb-6">Ready to Join?</h2>
            <p className="text-[#64748B] text-lg mb-10">
              Start your registration now and begin receiving direct bookings from our platform.
            </p>
            <button
              onClick={() => navigate('/guest/submit-hotel')}
              className="px-10 py-4 bg-[#B88E2F] text-white text-[13px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-[#9E7A28] transition-all shadow-sm border border-[#B88E2F]"
            >
              Start Registration
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ListYourHotelPage;
