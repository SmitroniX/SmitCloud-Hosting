import React, { forwardRef } from 'react';
import { Form } from 'formik';
import styled from 'styled-components/macro';
import { breakpoint } from '@/theme';
import FlashMessageRender from '@/components/FlashMessageRender';
import tw from 'twin.macro';

type Props = React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement> & {
    title?: string;
};

const Container = styled.div`
    ${breakpoint('sm')`
        ${tw`w-4/5 mx-auto`}
    `};

    ${breakpoint('md')`
        ${tw`p-10`}
    `};

    ${breakpoint('lg')`
        ${tw`w-3/5`}
    `};

    ${breakpoint('xl')`
        ${tw`w-full`}
        max-width: 700px;
    `};
`;

export default forwardRef<HTMLFormElement, Props>(({ title, ...props }, ref) => (
    <Container>
        {title && (
            <h2 css={tw`text-3xl text-center text-white font-bold tracking-tight py-4`}>
                {title}
            </h2>
        )}
        <FlashMessageRender css={tw`mb-3 px-1`} />
        <Form {...props} ref={ref}>
            <div className={'nebula-auth-card'} css={tw`md:flex w-full p-6 md:p-8 mx-1 items-center`}>
                <div css={tw`flex-none select-none mb-6 md:mb-0 md:w-64 text-center md:border-r md:border-white/10 md:pr-6`}>
                    <div css={tw`flex flex-col items-center justify-center px-2`}>
                        <div css={tw`relative mb-3`}>
                            <div
                                css={tw`absolute -inset-1 rounded-full bg-cyan-500 opacity-20 blur-md`}
                            />
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                css={tw`relative w-16 h-16`}
                            >
                                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                            </svg>
                        </div>
                        <h1
                            css={tw`text-2xl font-extrabold tracking-tight text-white`}
                            style={{
                                background: 'linear-gradient(135deg, #ffffff 40%, #38bdf8 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            SmitCloud
                        </h1>
                        <div css={tw`flex items-center gap-1.5 mt-1`}>
                            <span css={tw`text-xs uppercase tracking-widest text-cyan-400 font-bold`}>
                                Hosting
                            </span>
                            <span css={tw`inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse`} />
                            <span css={tw`text-[10px] text-neutral-400 uppercase tracking-wider font-semibold`}>
                                Nebula
                            </span>
                        </div>
                    </div>
                </div>
                <div css={tw`flex-1 md:pl-6`}>{props.children}</div>
            </div>
        </Form>
        <p css={tw`text-center text-neutral-400 text-xs mt-6`}>
            &copy; {new Date().getFullYear()}&nbsp;
            <a
                rel={'noopener nofollow noreferrer'}
                href={'https://smitronix.dev'}
                target={'_blank'}
                css={tw`no-underline text-cyan-400 hover:text-cyan-300 font-medium transition-colors`}
            >
                SmitCloud Hosting
            </a>
            &nbsp;&bull;&nbsp;Powered by Pterodactyl
        </p>
    </Container>
));
