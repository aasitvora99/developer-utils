import { useState, useEffect, useCallback, useMemo } from 'react';
import { Copy, RefreshCw, ArrowRight, ArrowLeft, Info, Shuffle, Sparkles, Code, Lock, Globe, Hash, Binary, Shield, FileText } from 'lucide-react';
import TextArea from './ui/TextArea';
import { useToast } from '@/hooks/useToast';
import { ToastComponent } from './ui/Toast';

const EncodeDecodeTools = () => {
  const { toasts, addToast, closeToast } = useToast();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [activeTab, setActiveTab] = useState('base64');
  const [isProcessing, setIsProcessing] = useState(false);


  const convertFunctions = useMemo(() => ({
    base64: {
      encode: (str: string) => btoa(unescape(encodeURIComponent(str))),
      decode: (str: string) => {
        try {
          return decodeURIComponent(escape(atob(str.replace(/\s/g, ''))));
        } catch (error) {
          throw new Error('Invalid Base64 string');
        }
      },
      description: 'Base64 encoding is commonly used for encoding binary data in text format',
      isValidEncoded: (str: string) => {
        const cleaned = str.replace(/\s/g, '');
        // Only consider it valid Base64 if it's longer than 8 characters
        // and properly formatted
        if (cleaned.length < 8 || cleaned.length % 4 !== 0) {
          return false;
        }
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
          return false;
        }
        // Additional check: try to decode it
        try {
          atob(cleaned);
          return true;
        } catch {
          return false;
        }
      },
      example: { input: 'Hello World!', output: 'SGVsbG8gV29ybGQh' },
      icon: Code
    },
    url: {
      encode: (str: string) => encodeURIComponent(str),
      decode: (str: string) => {
        try {
          return decodeURIComponent(str);
        } catch (error) {
          throw new Error('Invalid URL encoded string');
        }
      },
      description: 'URL encoding replaces unsafe ASCII characters with % followed by hex digits',
      isValidEncoded: (str: string) => {
        // Only auto-decode if it has URL encoded characters and is at least somewhat substantial
        return /%[0-9A-Fa-f]{2}/.test(str) && str.length > 3;
      },
      example: { input: 'Hello World!', output: 'Hello%20World%21' },
      icon: Globe
    },
    html: {
      encode: (str: string) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
      },
      decode: (str: string) => {
        try {
          const div = document.createElement('div');
          div.innerHTML = str;
          return div.textContent || '';
        } catch (error) {
          throw new Error('Invalid HTML entities');
        }
      },
      description: 'HTML encoding converts special characters to HTML entities',
      isValidEncoded: (str: string) => {
        // Only auto-decode if it has HTML entities and is substantial
        return /&[a-zA-Z]+;|&#\d+;|&#x[0-9A-Fa-f]+;/.test(str) && str.length > 4;
      },
      example: { input: '<script>alert("hi")</script>', output: '&lt;script&gt;alert(&quot;hi&quot;)&lt;/script&gt;' },
      icon: Code
    },
    hex: {
      encode: (str: string) => {
        return str.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
      },
      decode: (str: string) => {
        const cleaned = str.replace(/[\s\n]/g, '');
        if (cleaned.length % 2 !== 0) throw new Error('Invalid hex string length');
        try {
          return cleaned.match(/.{1,2}/g)
            ?.map(byte => String.fromCharCode(parseInt(byte, 16)))
            .join('') || '';
        } catch (error) {
          throw new Error('Invalid hex characters');
        }
      },
      description: 'Hexadecimal encoding converts each character to its hex representation',
      isValidEncoded: (str: string) => {
        const cleaned = str.replace(/\s/g, '');
        // Must be all hex chars, even length, and at least 4 chars long
        return /^[0-9A-Fa-f]+$/.test(cleaned) &&
          cleaned.length >= 4 &&
          cleaned.length % 2 === 0;
      },
      example: { input: 'Hello', output: '48656c6c6f' },
      icon: Hash
    },
    binary: {
      encode: (str: string) => {
        return str.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
      },
      decode: (str: string) => {
        const cleaned = str.replace(/[^01]/g, '');
        if (cleaned.length % 8 !== 0) throw new Error('Invalid binary string length');
        try {
          return cleaned.match(/.{1,8}/g)
            ?.map(byte => String.fromCharCode(parseInt(byte, 2)))
            .join('') || '';
        } catch (error) {
          throw new Error('Invalid binary characters');
        }
      },
      description: 'Binary encoding converts each character to its 8-bit binary representation',
      isValidEncoded: (str: string) => {
        const cleaned = str.replace(/\s/g, '');
        // Must be all binary chars, divisible by 8, and at least 8 chars long
        return /^[01]+$/.test(cleaned) &&
          cleaned.length >= 8 &&
          cleaned.length % 8 === 0;
      },
      example: { input: 'Hi', output: '01001000 01101001' },
      icon: Binary
    },
    jwt: {
      encode: (str: string) => {
        throw new Error('JWT encoding not supported - paste a JWT token to decode it');
      },
      decode: (str: string) => {
        try {
          const parts = str.split('.');
          if (parts.length !== 3) throw new Error('Invalid JWT format - must have 3 parts separated by dots');

          const [headerB64, payloadB64, signature] = parts;

          // Handle URL-safe Base64 padding
          const padHeader = headerB64.replace(/-/g, '+').replace(/_/g, '/').padEnd(headerB64.length + (4 - headerB64.length % 4) % 4, '=');
          const padPayload = payloadB64.replace(/-/g, '+').replace(/_/g, '/').padEnd(payloadB64.length + (4 - payloadB64.length % 4) % 4, '=');

          const header = JSON.parse(atob(padHeader));
          const payload = JSON.parse(atob(padPayload));

          return JSON.stringify({
            header,
            payload,
            signature: signature || 'No signature'
          }, null, 2);
        } catch (error) {
          throw new Error('Invalid JWT token format or corrupted data');
        }
      },
      description: 'JSON Web Token decoder - paste a JWT to see its header and payload',
      isValidEncoded: (str: string) => {
        const parts = str.split('.');
        // Must have exactly 3 parts, each part must be URL-safe Base64, and reasonable length
        return parts.length === 3 &&
          parts.every(part => part.length > 0 && /^[A-Za-z0-9_-]+$/.test(part)) &&
          str.length > 50; // JWTs are typically much longer
      },
      example: { input: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', output: 'Decoded JWT content' },
      icon: Shield
    }
  }), []);

  const performEncode = useCallback((text: string, tab: string) => {
    try {
      setIsProcessing(true);
      const result = convertFunctions[tab as keyof typeof convertFunctions].encode(text);
      setOutput(result);
      // addToast('Text encoded successfully', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Encoding failed';
      // addToast(`Error: ${message}`, 'error');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  }, [convertFunctions]);

  const performDecode = useCallback((text: string, tab: string) => {
    try {
      setIsProcessing(true);
      const { decode, isValidEncoded } = convertFunctions[tab as keyof typeof convertFunctions];

      if (isValidEncoded && !isValidEncoded(text.trim())) {
        throw new Error(`Input doesn't appear to be valid encoded text`);
      }

      const result = decode(text);
      setOutput(result);
      addToast('Text decoded successfully', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Decoding failed';
      addToast(`Error: ${message}`, 'error');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  }, [convertFunctions]);

  const handleAutoProcess = useCallback(() => {
    if (!input.trim()) return;
    const { isValidEncoded } = convertFunctions[activeTab as keyof typeof convertFunctions];
    const shouldDecode = isValidEncoded ? isValidEncoded(input.trim()) : false;

    if (shouldDecode) {
      performDecode(input, activeTab);
    } else {
      performEncode(input, activeTab);
    }
  }, [input, activeTab, performDecode, performEncode, convertFunctions]);

  useEffect(() => {
    if (input.trim() && activeTab !== 'jwt') {
      const timer = setTimeout(() => {
        handleAutoProcess();
      }, 300);
      return () => clearTimeout(timer);
    } else if (!input.trim()) {
      setOutput('');
    }
  }, [input, activeTab, handleAutoProcess]);

  const handleClearInput = () => {
    setInput('');
    setOutput('');
  };

  const handleClearOutput = () => setOutput('');

  const handleCopyInput = async () => {
    try {
      await navigator.clipboard.writeText(input);
      addToast('Input copied to clipboard', 'success');
    } catch (err) {
      addToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleCopyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      addToast('Output copied to clipboard', 'success');
    } catch (err) {
      addToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleEncode = () => {
    if (!input.trim()) {
      addToast('Please enter some text to encode', 'warning');
      return;
    }
    performEncode(input, activeTab);
  };

  const handleDecode = () => {
    if (!input.trim()) {
      addToast('Please enter some text to decode', 'warning');
      return;
    }
    performDecode(input, activeTab);
  };

  const handleSwap = () => {
    const temp = input;
    setInput(output);
    setOutput(temp);
    addToast('Input and output swapped', 'success');
  };

  const loadExample = () => {
    const example = convertFunctions[activeTab as keyof typeof convertFunctions].example;
    if (example) {
      setInput(example.input);
      addToast('Example loaded', 'success');
    }
  };

  const tabConfigs = [
    { id: 'base64', name: 'Base64', color: 'from-blue-500 to-blue-600', hoverColor: 'hover:from-blue-600 hover:to-blue-700', ring: 'ring-blue-500' },
    { id: 'url', name: 'URL', color: 'from-emerald-500 to-emerald-600', hoverColor: 'hover:from-emerald-600 hover:to-emerald-700', ring: 'ring-emerald-500' },
    { id: 'html', name: 'HTML', color: 'from-purple-500 to-purple-600', hoverColor: 'hover:from-purple-600 hover:to-purple-700', ring: 'ring-purple-500' },
    { id: 'hex', name: 'Hex', color: 'from-amber-500 to-amber-600', hoverColor: 'hover:from-amber-600 hover:to-amber-700', ring: 'ring-amber-500' },
    { id: 'binary', name: 'Binary', color: 'from-pink-500 to-pink-600', hoverColor: 'hover:from-pink-600 hover:to-pink-700', ring: 'ring-pink-500' },
    { id: 'jwt', name: 'JWT', color: 'from-orange-500 to-orange-600', hoverColor: 'hover:from-orange-600 hover:to-orange-700', ring: 'ring-orange-500' },
  ];

  const currentConfig = convertFunctions[activeTab as keyof typeof convertFunctions];
  const currentTabConfig = tabConfigs.find(t => t.id === activeTab)!;
  const isJWT = activeTab === 'jwt';
  const hasExample = currentConfig.example;
  const IconComponent = currentConfig.icon;

  const inputLooksEncoded = currentConfig.isValidEncoded ? currentConfig.isValidEncoded(input.trim()) : false;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Encode / Decode Tool</h2>
              <p className="text-muted-foreground text-sm mt-1">Transform text between different encoding formats</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={loadExample}
                disabled={!hasExample}
                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FileText size={16} className="mr-2" />
                Load Sample
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(input)}
                disabled={!input}
                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-background hover:bg-accent hover:text-accent-foreground border border-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Copy size={16} />
              </button>
              {input && output && (
                <button
                  onClick={handleSwap}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-background hover:bg-accent hover:text-accent-foreground border border-border transition-colors"
                  title="Swap input and output"
                >
                  <Shuffle size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="p-6">
          {/* Tab Selection */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {tabConfigs.map((tab) => {
              const TabIcon = convertFunctions[tab.id as keyof typeof convertFunctions].icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 
                    ${activeTab === tab.id
                      ? `bg-gradient-to-r ${tab.color} text-white shadow-md`
                      : `bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground border border-border`
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <TabIcon className="h-4 w-4" />
                    {tab.name}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Description */}
          {currentConfig.description && (
            <div className="bg-card border border-border rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className={`p-2 bg-gradient-to-br ${currentTabConfig.color} rounded-lg shadow-sm`}>
                  <IconComponent className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-card-foreground text-sm mb-3">
                    {currentConfig.description}
                  </p>
                  {hasExample && (
                    <div className="text-xs text-muted-foreground font-mono">
                      Example: "{currentConfig.example.input}" → "{currentConfig.example.output.length > 15 ? currentConfig.example.output.substring(0, 15) + '...' : currentConfig.example.output}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Content - Input/Output */}
          <div className="grid lg:grid-cols-2 gap-4 mb-6">
            {/* Input Section */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-card-foreground">Input</h2>
                  {input && inputLooksEncoded && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs rounded-md">
                      <Lock className="h-3 w-3" />
                      Encoded
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {input && (
                    <>
                      <button
                        onClick={handleCopyInput}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                      <button
                        onClick={handleClearInput}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="relative">
                <TextArea
                  value={input}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder={`Enter text to ${isJWT ? 'decode (paste JWT token)' : 'encode or decode'}...`}
                  spellCheck={false}
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
                    <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg shadow-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-muted-foreground">Processing...</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                <span>{input.length.toLocaleString()} characters</span>
                {!isJWT && input && (
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${inputLooksEncoded ? 'bg-blue-500' : 'bg-green-500'} animate-pulse`}></div>
                    <span>{inputLooksEncoded ? 'Auto-decoding...' : 'Auto-encoding...'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Output Section */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-card-foreground">Output</h2>
                  {output && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs rounded-md">
                      <Sparkles className="h-3 w-3" />
                      Ready
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {output && (
                    <>
                      <button
                        onClick={handleCopyOutput}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                      <button
                        onClick={handleClearOutput}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="relative">
                <TextArea
                  value={output}
                  readOnly
                  className="min-h-[300px] font-mono text-sm bg-muted/50"
                  placeholder="Result will appear here automatically..."
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                <span>{output.length.toLocaleString()} characters</span>
                {output && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span>Complete</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center items-center gap-3 mb-6">
            {!isJWT && (
              <>
                <button
                  onClick={handleEncode}
                  disabled={!input.trim() || isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  <ArrowRight className="h-4 w-4" />
                  Force Encode
                </button>

                <button
                  onClick={handleDecode}
                  disabled={!input.trim() || isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Force Decode
                </button>
              </>
            )}

            {isJWT && (
              <button
                onClick={handleDecode}
                disabled={!input.trim() || isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                <Shield className="h-4 w-4" />
                Decode JWT
              </button>
            )}
          </div>

          {/* Usage Tips */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-card-foreground">Usage Tips</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>• Auto-processing as you type (except JWT)</li>
                <li>• Smart detection of encoded input</li>
                <li>• Use "Force" buttons to override detection</li>
              </ul>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>• Click "Load Sample" to see examples</li>
                <li>• All processing happens locally</li>
                <li>• Copy buttons for quick workflow</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      {toasts.map(toast => (
        <ToastComponent
          key={toast.id}
          message={toast.message}
          type={toast.type}
          open={toast.open}
          onOpenChange={(open) => {
            if (!open) closeToast(toast.id);

          }}
        />
      ))}

    </div>
  );
};

export default EncodeDecodeTools;