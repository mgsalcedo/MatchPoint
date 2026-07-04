interface MatchGuideProps {
  text: string;
}

export function MatchGuide({ text }: MatchGuideProps) {
  return (
    <div className="match-guide">
      <div className="match-guide-avatar" aria-hidden="true">
        M
      </div>
      <p className="match-guide-text">{text}</p>
    </div>
  );
}
