import Image from "next/image";

export function Footer() {
  return (
    <footer
      className="text-white/70 py-3 px-4 md:py-4 md:px-6 flex items-center justify-center gap-3 text-xs md:text-sm"
      style={{ backgroundColor: "#1e3a5f" }}
      data-print-hide
    >
      <Image
        src="/acp-logo.svg"
        alt="ACP Michigan"
        width={32}
        height={27}
        className="opacity-80"
      />
      <span>Developed by ACP Michigan &copy; {new Date().getFullYear()}</span>
    </footer>
  );
}
