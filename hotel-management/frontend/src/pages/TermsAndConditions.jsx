import React from 'react';

const TermsAndConditions = () => {
  return (
    <main className="min-h-screen bg-[#F8F6F2] text-[#1A2332]">
      <section className="max-w-4xl mx-auto px-6 py-14">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Terms and Conditions</h1>
        <p className="text-sm text-[#6B7B8D] mb-10">Last updated: March 28, 2026</p>

        <div className="space-y-8 text-[15px] leading-7">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
            <p>
              By using Nepal Stays, you agree to these terms, our booking policies, and all applicable laws and regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Booking and Payments</h2>
            <p>
              All bookings are subject to room availability and payment confirmation. Prices, taxes, and platform fees are shown during checkout.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Cancellations and Refunds</h2>
            <p>
              Cancellation and refund eligibility depends on the property policy, booking status, and payment timeline shown at the time of reservation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. User Responsibilities</h2>
            <p>
              You must provide accurate account and booking information, respect hotel property rules, and avoid misuse of the platform or payment systems.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Account and Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and for activities performed using your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Contact</h2>
            <p>
              For legal or policy inquiries, contact us at reservations@staynepal.com.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
};

export default TermsAndConditions;
