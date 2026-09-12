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
        {title && <h2 css={tw`text-3xl text-center text-neutral-100 font-medium py-4`}>{title}</h2>}
        <FlashMessageRender css={tw`mb-2 px-1`} />
        <Form {...props} ref={ref}>
            <div css={tw`md:flex w-full bg-white shadow-lg rounded-lg p-6 md:pl-0 mx-1`}>
                <div css={tw`flex-none select-none mb-6 md:mb-0 self-center md:w-64 text-center`}>
                    <div css={tw`flex flex-col items-center justify-center px-4`}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#3B82F6"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            css={tw`w-16 h-16 mb-3`}
                        >
                            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                        </svg>
                        <h1 css={tw`text-2xl font-bold text-neutral-800 leading-tight`}>
                            SmitCloud
                        </h1>
                        <p css={tw`text-sm text-neutral-500 font-medium`}>Hosting</p>
                    </div>
                </div>
                <div css={tw`flex-1`}>{props.children}</div>
            </div>
        </Form>
        <p css={tw`text-center text-neutral-500 text-xs mt-4`}>
            &copy; {new Date().getFullYear()}&nbsp;
            <a
                rel={'noopener nofollow noreferrer'}
                href={'https://smitronix.dev'}
                target={'_blank'}
                css={tw`no-underline text-neutral-500 hover:text-neutral-300`}
            >
                SmitCloud Hosting
            </a>
            &nbsp;&bull;&nbsp;Powered by Pterodactyl
        </p>
    </Container>
));
