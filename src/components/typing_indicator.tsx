import React from "react";

const TypingIndicator = () => {
    return (
        <li>
            <div className="received">
                <div className="grey">
                    <div className="flex space-x-2 items-center h-6">
                        <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                        />
                        <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                        />
                        <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                        />
                    </div>
                </div>
            </div>
        </li>
    );
};

export default TypingIndicator;
