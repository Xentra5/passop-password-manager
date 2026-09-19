const Footer = () => {
  return (
    <footer className="site-footer w-full border-t border-[#ddd8d0] bg-[#f4f1ec] py-6 text-[#7b746b]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-[#1f2933]">PassVault</span>
          <span className="text-xs text-[#958e85]">Personal password manager</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Your credentials stay yours.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
