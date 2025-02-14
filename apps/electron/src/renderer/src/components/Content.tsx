interface ContentProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const Content = ({ title, children, className }: ContentProps) => {
  return (
    <div
      className={`relative flex flex-1 flex-col bg-base-200/70 ${
        className ?? ""
      }`}
    >
      {/* title */}
      {title}

      {/* main */}
      <div className="scroll-y flex-1">{children}</div>
    </div>
  );
};

export default Content;
