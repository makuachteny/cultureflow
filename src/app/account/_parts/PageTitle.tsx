export default function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mb-8 font-display text-[28px] font-bold text-nile-900">
      {children}
    </h1>
  );
}
