import PassVaultLogo from "./PassVaultLogo";

const Footer = ({ theme = "light" }) => {
  return (
    <footer className={`site-footer w-full border-t py-6 transition-colors duration-300 ${
      theme === "dark" 
        ? "border-white/10 bg-[#0b0f17] text-[#8b949e]" 
        : "border-[#ddd8d0] bg-[#f4f1ec] text-[#7b746b]"
    }`}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <PassVaultLogo size="sm" showTagline={false} />
          <span className={`text-xs ${theme === "dark" ? "text-[#8b949e]" : "text-[#958e85]"}`}>
            • Zero-knowledge personal password manager
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Your credentials stay yours.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
