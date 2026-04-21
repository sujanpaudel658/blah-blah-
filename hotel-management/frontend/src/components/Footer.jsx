import React from 'react';

const Footer = () => {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <footer className="bg-[#1A2332] text-white pt-20 pb-10 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          <div className="space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="h-16 w-44 overflow-hidden flex items-center">
                <img
                  src="/images/website_logo.png"
                  alt="StayNepal"
                  className="h-full w-auto object-contain origin-left scale-[2.2]"
                />
              </div>
            </div>
            <p className="text-[14px] text-[#8896A6] leading-relaxed max-w-xs">
              Handpicked hotels across Nepal — from the bustling streets of Kathmandu to the serene lakesides of Pokhara. Experience premium hospitality.
            </p>
          </div>

          <div className="space-y-6">
            <h4 className="text-[14px] font-bold uppercase tracking-[0.2em] text-white">Explore</h4>
            <ul className="space-y-3">
              <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-[13px] text-[#8896A6] hover:text-[#C4993E] transition-colors">Home Landing</button></li>
              <li><a href="/guest/dashboard" className="text-[13px] text-[#8896A6] hover:text-[#C4993E] transition-colors">Available Rooms</a></li>
              <li><button onClick={() => scrollToSection('experiences')} className="text-[13px] text-[#8896A6] hover:text-[#C4993E] transition-colors">Guest Reviews</button></li>
              <li><button onClick={() => scrollToSection('hotels')} className="text-[13px] text-[#8896A6] hover:text-[#C4993E] transition-colors">Partner Hotels</button></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-[14px] font-bold uppercase tracking-[0.2em] text-white">Find Us</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#C4993E] text-[18px]">location_on</span>
                <p className="text-[13px] text-[#8896A6]">
                  Smakhusi 26, Kathmandu, Nepal
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#C4993E] text-[18px]">call</span>
                <p className="text-[13px] text-[#8896A6]">+977 01-43644145</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#C4993E] text-[18px]">mail</span>
                <p className="text-[13px] text-[#8896A6]">sujanpaudel368@gmail.com</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-[14px] font-bold uppercase tracking-[0.2em] text-white">Connect</h4>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-[#C4993E] transition-all group">
                <span className="material-symbols-outlined text-[20px] text-[#8896A6] group-hover:text-white">public</span>
              </a>
              <a href="#" className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-[#C4993E] transition-all group">
                <span className="material-symbols-outlined text-[20px] text-[#8896A6] group-hover:text-white">alternate_email</span>
              </a>
              <a href="#" className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-[#C4993E] transition-all group">
                <span className="material-symbols-outlined text-[20px] text-[#8896A6] group-hover:text-white">share</span>
              </a>
            </div>
            <p className="text-[12px] text-[#596A7D] leading-relaxed">
              Verified hotel network. <br />
              Secure payment by Khalti.
            </p>
          </div>

        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-[#596A7D]">
            &copy; 2024 StayNepal Integrated Portal. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="/privacy-policy" className="text-[11px] text-[#596A7D] hover:text-white">Privacy Policy</a>
            <a href="/terms-and-conditions" className="text-[11px] text-[#596A7D] hover:text-white">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
