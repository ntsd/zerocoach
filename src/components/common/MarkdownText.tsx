import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { COLORS } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';

interface MarkdownTextProps {
  content: string;
  accentColor?: string;
  isUser?: boolean;
  style?: ViewStyle;
  baseTextStyle?: TextStyle;
}

/**
 * Tokenizes inline Markdown:
 * - Bold + Italic: ***text***
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Inline Code: `text`
 * - Links: [label](url)
 */
function renderInlineContent(
  text: string,
  accentColor: string,
  baseTextStyle?: TextStyle,
  keyPrefix = 'inline'
): React.ReactNode {
  // Regex matches:
  // 1. Bold Italic: ***...***
  // 2. Bold: **...**
  // 3. Bold underscore: __...__
  // 4. Inline code: `...`
  // 5. Italic: *...*
  // 6. Italic underscore: _..._
  // 7. Markdown links: [text](url)
  const tokenRegex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|__.*?__|`.*?`|\*.*?\*|_.*?_|\[.*?\]\(.*?\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (!part) return null;

    // Bold + Italic: ***text***
    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      return (
        <Text
          key={key}
          style={[styles.boldText, styles.italicText, baseTextStyle, { color: '#FFFFFF' }]}
        >
          {part.slice(3, -3)}
        </Text>
      );
    }

    // Bold: **text** or __text__
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      return (
        <Text key={key} style={[styles.boldText, baseTextStyle, { color: '#FFFFFF' }]}>
          {part.slice(2, -2)}
        </Text>
      );
    }

    // Inline Code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <Text
          key={key}
          style={[
            styles.inlineCode,
            { color: accentColor, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
          ]}
        >
          {part.slice(1, -1)}
        </Text>
      );
    }

    // Italic: *text* or _text_
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      return (
        <Text key={key} style={[styles.italicText, baseTextStyle]}>
          {part.slice(1, -1)}
        </Text>
      );
    }

    // Markdown link: [text](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <Text key={key} style={[styles.linkText, { color: accentColor }]}>
          {linkMatch[1]}
        </Text>
      );
    }

    // Check if the part has a "Key: " pattern at the start (e.g. "Scapular Retraction: ")
    const colonPrefixMatch = part.match(/^([A-Za-z0-9\s—–-]{2,30}:)(\s+.*)?$/);
    if (colonPrefixMatch && !text.includes('**')) {
      return (
        <Text key={key} style={baseTextStyle}>
          <Text style={[styles.boldText, { color: '#FFFFFF' }]}>
            {colonPrefixMatch[1]}
          </Text>
          {colonPrefixMatch[2] || ''}
        </Text>
      );
    }

    // Plain text
    return (
      <Text key={key} style={baseTextStyle}>
        {part}
      </Text>
    );
  });
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({
  content,
  accentColor = COLORS.strict.accent,
  isUser = false,
  style,
  baseTextStyle,
}) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Code Block boundary: ```
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <View key={`code-${i}`} style={styles.codeBlockContainer}>
            {codeBlockLang ? (
              <View style={styles.codeBlockHeader}>
                <Text style={styles.codeBlockLang}>{codeBlockLang.toUpperCase()}</Text>
              </View>
            ) : null}
            <Text style={styles.codeBlockText}>{codeBlockBuffer.join('\n')}</Text>
          </View>
        );
        inCodeBlock = false;
        codeBlockBuffer = [];
        codeBlockLang = '';
      } else {
        // Start of code block
        inCodeBlock = true;
        codeBlockLang = trimmed.replace('```', '').trim();
        codeBlockBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(rawLine);
      continue;
    }

    // 2. Empty line spacer
    if (!trimmed) {
      elements.push(<View key={`empty-${i}`} style={styles.emptySpacer} />);
      continue;
    }

    // 3. Horizontal Rule: ---, ___, ***
    if (trimmed === '---' || trimmed === '___' || trimmed === '***') {
      elements.push(<View key={`hr-${i}`} style={styles.horizontalRule} />);
      continue;
    }

    // 4. Headers: #, ##, ###, ####
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const headingText = match[2];

        let headingStyle: TextStyle = styles.h1;
        if (level === 2) headingStyle = styles.h2;
        if (level === 3) headingStyle = styles.h3;
        if (level === 4) headingStyle = styles.h4;

        elements.push(
          <Text
            key={`h-${i}`}
            style={[
              headingStyle,
              { color: isUser ? COLORS.textPrimary : accentColor },
            ]}
          >
            {renderInlineContent(headingText, accentColor, headingStyle, `h-${i}`)}
          </Text>
        );
        continue;
      }
    }

    // 5. Blockquote: > text
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s?/, '');
      elements.push(
        <View
          key={`quote-${i}`}
          style={[styles.blockquote, { borderLeftColor: accentColor }]}
        >
          <Text style={styles.blockquoteText}>
            {renderInlineContent(quoteText, accentColor, styles.blockquoteText, `quote-${i}`)}
          </Text>
        </View>
      );
      continue;
    }

    // 6. Unordered List Items: * item, - item, + item, • item (with optional leading indent)
    const bulletMatch = rawLine.match(/^(\s*)([*•+-])\s+(.*)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length;
      const bulletContent = bulletMatch[3];

      elements.push(
        <View
          key={`bullet-${i}`}
          style={[styles.bulletRow, indent > 0 && { marginLeft: Math.min(indent * 8, 24) }]}
        >
          <Text style={[styles.bulletSymbol, { color: accentColor }]}>•</Text>
          <Text style={[styles.paragraph, baseTextStyle, styles.bulletContent]}>
            {renderInlineContent(
              bulletContent,
              accentColor,
              baseTextStyle || styles.paragraph,
              `b-${i}`
            )}
          </Text>
        </View>
      );
      continue;
    }

    // 7. Ordered List Items: 1. item, 2. item, etc.
    const numMatch = rawLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const indent = numMatch[1].length;
      const numLabel = `${numMatch[2]}.`;
      const numContent = numMatch[3];

      elements.push(
        <View
          key={`num-${i}`}
          style={[styles.bulletRow, indent > 0 && { marginLeft: Math.min(indent * 8, 24) }]}
        >
          <Text style={[styles.numSymbol, { color: accentColor }]}>{numLabel}</Text>
          <Text style={[styles.paragraph, baseTextStyle, styles.bulletContent]}>
            {renderInlineContent(
              numContent,
              accentColor,
              baseTextStyle || styles.paragraph,
              `num-${i}`
            )}
          </Text>
        </View>
      );
      continue;
    }

    // 8. Standard paragraph line
    elements.push(
      <Text key={`p-${i}`} style={[styles.paragraph, baseTextStyle]}>
        {renderInlineContent(rawLine, accentColor, baseTextStyle || styles.paragraph, `p-${i}`)}
      </Text>
    );
  }

  // Handle unclosed code block if streaming/incomplete
  if (inCodeBlock && codeBlockBuffer.length > 0) {
    elements.push(
      <View key="code-unclosed" style={styles.codeBlockContainer}>
        <Text style={styles.codeBlockText}>{codeBlockBuffer.join('\n')}</Text>
      </View>
    );
  }

  return <View style={[styles.container, style]}>{elements}</View>;
};

const styles = StyleSheet.create({
  container: {
    gap: 3,
  },
  paragraph: {
    ...TYPOGRAPHY.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  boldText: {
    fontWeight: '700',
  },
  italicText: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 12,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  linkText: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  h1: {
    ...TYPOGRAPHY.h2,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  h2: {
    ...TYPOGRAPHY.h3,
    fontSize: 15.5,
    fontWeight: '700',
    marginTop: 5,
    marginBottom: 2,
  },
  h3: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 2,
  },
  h4: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  emptySpacer: {
    height: 5,
  },
  horizontalRule: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
    marginVertical: 6,
  },
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: SPACING.sm,
    paddingVertical: 2,
    marginVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: RADIUS.xs,
  },
  blockquoteText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 1.5,
  },
  bulletSymbol: {
    fontSize: 14,
    marginRight: 7,
    lineHeight: 20,
    fontWeight: '800',
  },
  numSymbol: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 12,
    marginRight: 6,
    lineHeight: 20,
    fontWeight: '700',
    minWidth: 16,
  },
  bulletContent: {
    flex: 1,
  },
  codeBlockContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.sm,
    marginVertical: 4,
  },
  codeBlockHeader: {
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 2,
  },
  codeBlockLang: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  codeBlockText: {
    fontFamily: 'monospace',
    fontSize: 11.5,
    color: '#38BDF8',
    lineHeight: 16,
  },
});
