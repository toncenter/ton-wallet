// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import React from 'react';

const hasChildren = (node: any) => node && (node.children || (node.props && node.props.children));

const getChildren = (node: any) =>
    node && node.children ? node.children : node.props && node.props.children;

const renderNodes: any = (reactNodes: any) => {
    if (typeof reactNodes === 'string') {
        return reactNodes;
    }

    return Object.keys(reactNodes).map((key, i) => {
        const child = reactNodes[key];
        const isElement = React.isValidElement(child);

        if (typeof child === 'string') {
            return child;
        }
        if (hasChildren(child)) {
            const inner = renderNodes(getChildren(child));
            return React.cloneElement(child, { ...child.props, key: i }, inner);
        }
        if (typeof child === 'object' && !isElement) {
            return Object.keys(child).reduce((str, childKey) => `${str}${child[childKey]}`, '');
        }

        return child;
    });
};

// this mock makes sure any components using the translate hook can use it without a warning being shown
jest.mock('react-i18next', () => ({
    useTranslation: () => {
        return {
            t: (str: string) => str,
            i18n: {
                changeLanguage: () => new Promise(() => {}),
            },
        };
    },
    Trans: ({ children }: any) => Array.isArray(children) ? renderNodes(children) : renderNodes([children]),
}));
