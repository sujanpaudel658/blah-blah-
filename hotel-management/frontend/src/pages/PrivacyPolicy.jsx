import React from 'react';

const PrivacyPolicy = () => {
  return (
    <main className="min-h-screen bg-[#F8F6F2] text-[#1A2332]">
      <section className="max-w-4xl mx-auto px-6 py-14">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-sm text-[#6B7B8D] mb-10">Last updated: March 28, 2026</p>

        <div className="space-y-8 text-[15px] leading-7">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
            <p>
              Nepal Stays collects account details, booking information, and payment-related metadata required to provide reservation services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. How We Use Information</h2>
            <p>
              We use your data to process bookings, communicate transaction updates, improve platform performance, and provide customer support.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Data Sharing</h2>
            <p>
              We share necessary booking details with partner hotels and payment providers only as required to complete reservations and payments.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Data Security</h2>
            <p>
              We apply reasonable technical and organizational safeguards to protect personal data from unauthorized access or disclosure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Contact</h2>
            <p>
              For privacy-related requests, contact reservations@staynepal.com.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
};

export default PrivacyPolicy;
