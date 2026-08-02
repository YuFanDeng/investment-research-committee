export function UnknownContentBlock({ block }: { block: unknown }) {
  return (
    <details className="assistant-unknown-block">
      <summary>Additional structured result</summary>
      <pre>{JSON.stringify(block, null, 2)}</pre>
    </details>
  );
}
