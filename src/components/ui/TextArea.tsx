import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

const TextArea: React.FC<TextAreaProps> = ({ className = '', ...props }) => (
  <textarea
    className={`
      w-full p-4 border-2 border-gray-200 dark:border-gray-700 
      rounded-xl resize-vertical backdrop-blur-sm
      focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 
      transition-all duration-300 ease-out
      bg-white/80 dark:bg-gray-800/80 
      text-gray-900 dark:text-gray-100
      placeholder:text-gray-500 dark:placeholder:text-gray-400
      hover:border-gray-300 dark:hover:border-gray-600
      shadow-sm hover:shadow-md focus:shadow-lg
      ${className}
    `}
    {...props}
  />
);

export default TextArea;