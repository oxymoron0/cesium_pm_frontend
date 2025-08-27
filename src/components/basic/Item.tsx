interface ItemProps {
  children: React.ReactNode;
}

export default function Item({ children }: ItemProps) {
  return (
    <div className="flex items-start self-stretch h-[88px] px-5 py-4 gap-[10px] rounded-lg border border-[#696A6A] bg-black">
      {children}
    </div>
  );
}