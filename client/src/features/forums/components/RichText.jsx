import clsx from 'clsx';
import { Fragment } from 'react';
import { parseBlocks, parseInline } from '../lib/rich-text';
import styles from './RichText.module.css';

function Inline({ text }) {
    return parseInline(text).map((node, index) => {
        switch (node.type) {
            case 'bold': return <strong key={index}>{node.value}</strong>;
            case 'italic': return <em key={index}>{node.value}</em>;
            case 'code': return <code key={index}>{node.value}</code>;
            case 'link': return <a key={index} href={node.href} target="_blank" rel="noopener noreferrer nofollow ugc">{node.value}</a>;
            default: return <Fragment key={index}>{node.value}</Fragment>;
        }
    });
}

function Blocks({ blocks }) {
    return blocks.map((block, index) => {
        if (block.type === 'quote') return <blockquote key={index}><Blocks blocks={block.blocks} /></blockquote>;
        if (block.type === 'list') {
            return <ul key={index}>{block.items.map((item, i) => <li key={i}><Inline text={item} /></li>)}</ul>;
        }
        return (
            <p key={index}>
                {block.lines.map((line, i) => (
                    <Fragment key={i}>
                        {i > 0 && <br />}
                        <Inline text={line} />
                    </Fragment>
                ))}
            </p>
        );
    });
}

/** Renders a forum post's text with its light formatting (see lib/rich-text.js). */
export default function RichText({ text, className }) {
    return <div className={clsx(styles.richText, className)}><Blocks blocks={parseBlocks(text)} /></div>;
}
