/**
 * Leo's mark: a speech bubble with a sparkle cut out of it, drawn in currentColor so it
 * takes the colour of whatever it sits on. Used on the launcher and in the chat header.
 */
const LeoMark = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
        <path
            fillRule="evenodd"
            d="M8 3H16A6 6 0 0 1 22 9V12A6 6 0 0 1 16 18H10.6L6.9 20.9C6.25 21.4 5.3 20.95 5.3 20.1V17.36A6 6 0 0 1 2 12V9A6 6 0 0 1 8 3Z M12 6.25Q12.55 9.95 16.25 10.5Q12.55 11.05 12 14.75Q11.45 11.05 7.75 10.5Q11.45 9.95 12 6.25Z"
        />
    </svg>
);

export default LeoMark;
