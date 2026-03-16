import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-4 px-6 flex items-center justify-center gap-3 text-sm print:hidden" data-print-hide>
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
