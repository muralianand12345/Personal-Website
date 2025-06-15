import re


def remove_thinking_tags(text: str) -> str:
    """Remove thinking tags from text."""
    # Remove various thinking tag patterns
    patterns = [
        r"<think>.*?</think>",
        r"<antThinking>.*?</antThinking>",
        r"<\w*thinking\w*>.*?</\w*thinking\w*>",
    ]

    for pattern in patterns:
        text = re.sub(pattern, "", text, flags=re.DOTALL | re.IGNORECASE)

    return text.strip()
