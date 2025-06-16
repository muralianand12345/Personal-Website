def format_duration(milliseconds: int) -> str:
    """Convert milliseconds to human-readable duration format."""
    if milliseconds <= 0:
        return "0 seconds"

    # Convert to seconds
    total_seconds = milliseconds // 1000

    # Calculate time units
    years = total_seconds // (365 * 24 * 3600)
    days = (total_seconds % (365 * 24 * 3600)) // (24 * 3600)
    hours = (total_seconds % (24 * 3600)) // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60

    # Build formatted string
    parts = []

    if years > 0:
        parts.append(f"{years} year{'s' if years != 1 else ''}")
    if days > 0:
        parts.append(f"{days} day{'s' if days != 1 else ''}")
    if hours > 0:
        parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    if minutes > 0:
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
    if seconds > 0 or not parts:
        parts.append(f"{seconds} second{'s' if seconds != 1 else ''}")

    if len(parts) > 2:
        return ", ".join(parts[:-1]) + f", and {parts[-1]}"
    elif len(parts) == 2:
        return f"{parts[0]} and {parts[1]}"
    else:
        return parts[0] if parts else "0 seconds"
