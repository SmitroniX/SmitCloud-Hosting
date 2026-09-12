import TransferListener from '@/components/server/TransferListener';
import React, { useEffect, useState } from 'react';
import { NavLink, Route, Switch, useRouteMatch } from 'react-router-dom';
import NavigationBar from '@/components/NavigationBar';
import TransitionRouter from '@/TransitionRouter';
import WebsocketHandler from '@/components/server/WebsocketHandler';
import { ServerContext } from '@/state/server';
import { CSSTransition } from 'react-transition-group';
import Can from '@/components/elements/Can';
import Spinner from '@/components/elements/Spinner';
import { NotFound, ServerError } from '@/components/elements/ScreenBlock';
import { httpErrorToHuman } from '@/api/http';
import { useStoreState } from 'easy-peasy';
import SubNavigation from '@/components/elements/SubNavigation';
import InstallListener from '@/components/server/InstallListener';
import ErrorBoundary from '@/components/elements/ErrorBoundary';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { useLocation } from 'react-router';
import ConflictStateRenderer from '@/components/server/ConflictStateRenderer';
import PermissionRoute from '@/components/elements/PermissionRoute';
import routes from '@/routers/routes';

export default () => {
    const match = useRouteMatch<{ id: string }>();
    const location = useLocation();

    const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const [error, setError] = useState('');

    const id = ServerContext.useStoreState((state) => state.server.data?.id);
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
    const inConflictState = ServerContext.useStoreState((state) => state.server.inConflictState);
    const serverId = ServerContext.useStoreState((state) => state.server.data?.internalId);
    const getServer = ServerContext.useStoreActions((actions) => actions.server.getServer);
    const clearServerState = ServerContext.useStoreActions((actions) => actions.clearServerState);

    const to = (value: string, url = false) => {
        if (value === '/') {
            return url ? match.url : match.path;
        }
        return `${(url ? match.url : match.path).replace(/\/*$/, '')}/${value.replace(/^\/+/, '')}`;
    };

    useEffect(
        () => () => {
            clearServerState();
        },
        []
    );

    useEffect(() => {
        setError('');

        getServer(match.params.id).catch((error) => {
            console.error(error);
            setError(httpErrorToHuman(error));
        });

        return () => {
            clearServerState();
        };
    }, [match.params.id]);

    const isMinecraftActive = location.pathname.includes('/minecraft');
    const [subnavCategory, setSubnavCategory] = useState<'all' | 'software' | 'config' | 'community' | 'diagnostics'>('all');

    const minecraftSubRoutes = [
        { path: '/minecraft', name: '🏠 Overview', category: 'all', permission: null, exact: true },
        // Software & Content
        { path: '/minecraft/version', name: '⚡ Software & Version', category: 'software', permission: 'file.*' },
        { path: '/minecraft/plugins', name: '🔌 Plugins', category: 'software', permission: 'file.*' },
        { path: '/minecraft/mods', name: '📦 Mods', category: 'software', permission: 'file.*' },
        { path: '/minecraft/modpacks', name: '🎁 Modpacks', category: 'software', permission: 'file.*' },
        { path: '/minecraft/datapacks', name: '🔮 Datapacks', category: 'software', permission: 'file.*' },
        { path: '/minecraft/worlds', name: '🗺️ Worlds & Maps', category: 'software', permission: 'file.*' },
        // Config & Networking
        { path: '/minecraft/properties', name: '⚙️ Server Properties', category: 'config', permission: 'file.*' },
        { path: '/minecraft/motd', name: '🎨 MOTD & Icon', category: 'config', permission: 'file.*' },
        { path: '/minecraft/domain', name: '🌐 Custom Domains', category: 'config', permission: 'allocation.*' },
        { path: '/minecraft/geyser', name: '🎮 Bedrock Crossplay', category: 'config', permission: 'file.*' },
        { path: '/minecraft/auth', name: '🔐 Hybrid Auth', category: 'config', permission: 'file.*' },
        { path: '/minecraft/map', name: '🗺️ 3D Map', category: 'config', permission: 'file.*' },
        // Players & Community
        { path: '/minecraft/players', name: '👥 Players', category: 'community', permission: 'file.*' },
        { path: '/minecraft/moderation', name: '🛡️ Moderation', category: 'community', permission: 'file.*' },
        { path: '/minecraft/discord', name: '💬 Discord', category: 'community', permission: 'file.*' },
        // Diagnostics & Performance
        { path: '/minecraft/health', name: '📊 Health & TPS', category: 'diagnostics', permission: null },
        { path: '/minecraft/doctor', name: '🩺 Crash Doctor', category: 'diagnostics', permission: 'file.*' },
        { path: '/minecraft/optimizer', name: '⚡ Optimizer', category: 'diagnostics', permission: 'file.*' },
        { path: '/minecraft/ddos', name: '🛡️ DDoS Shield', category: 'diagnostics', permission: 'file.*' },
    ];

    const coreRoutes = routes.server.filter((route) => !!route.name && !route.path.startsWith('/minecraft'));
    const startupIndex = coreRoutes.findIndex((r) => r.path === '/startup');
    const preStartupRoutes = startupIndex >= 0 ? coreRoutes.slice(0, startupIndex + 1) : coreRoutes;
    const postStartupRoutes = startupIndex >= 0 ? coreRoutes.slice(startupIndex + 1) : [];

    return (
        <React.Fragment key={'server-router'}>
            <NavigationBar />
            {!uuid || !id ? (
                error ? (
                    <ServerError message={error} />
                ) : (
                    <Spinner size={'large'} centered />
                )
            ) : (
                <>
                    <CSSTransition timeout={150} classNames={'fade'} appear in>
                        <SubNavigation>
                            <div>
                                {preStartupRoutes.map((route) =>
                                    route.permission ? (
                                        <Can key={route.path} action={route.permission} matchAny>
                                            <NavLink to={to(route.path, true)} exact={route.exact}>
                                                {route.name}
                                            </NavLink>
                                        </Can>
                                    ) : (
                                        <NavLink key={route.path} to={to(route.path, true)} exact={route.exact}>
                                            {route.name}
                                        </NavLink>
                                    )
                                )}

                                <NavLink
                                    to={to('/minecraft', true)}
                                    isActive={() => isMinecraftActive}
                                    className={isMinecraftActive ? 'active' : ''}
                                >
                                    🎮 Minecraft Hub
                                </NavLink>

                                {postStartupRoutes.map((route) =>
                                    route.permission ? (
                                        <Can key={route.path} action={route.permission} matchAny>
                                            <NavLink to={to(route.path, true)} exact={route.exact}>
                                                {route.name}
                                            </NavLink>
                                        </Can>
                                    ) : (
                                        <NavLink key={route.path} to={to(route.path, true)} exact={route.exact}>
                                            {route.name}
                                        </NavLink>
                                    )
                                )}

                                {rootAdmin && (
                                    // eslint-disable-next-line react/jsx-no-target-blank
                                    <a href={`/admin/servers/view/${serverId}`} target={'_blank'}>
                                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                                    </a>
                                )}
                            </div>
                        </SubNavigation>
                    </CSSTransition>

                    {isMinecraftActive && (
                        <div className={'w-full bg-[#080d1a] border-b border-cyan-500/20 shadow-md select-none py-2 px-3 sm:px-6 overflow-x-auto scrollbar-none'}>
                            <div className={'flex items-center gap-1.5 sm:gap-2 mx-auto max-w-[1280px] min-w-max'}>
                                {/* Category Filter Buttons */}
                                <div className={'flex items-center gap-1 p-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] font-bold mr-2'}>
                                    {[
                                        { id: 'all', label: 'All' },
                                        { id: 'software', label: '⚡ Software' },
                                        { id: 'config', label: '⚙️ Config' },
                                        { id: 'community', label: '👥 Community' },
                                        { id: 'diagnostics', label: '🛡️ Health' },
                                    ].map((cat) => (
                                        <button
                                            key={cat.id}
                                            type={'button'}
                                            onClick={() => setSubnavCategory(cat.id as any)}
                                            className={`px-2 py-0.5 rounded transition ${
                                                subnavCategory === cat.id
                                                    ? 'bg-cyan-500 text-black font-extrabold shadow'
                                                    : 'text-neutral-400 hover:text-white'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                {minecraftSubRoutes
                                    .filter((subRoute) => subnavCategory === 'all' || subRoute.category === 'all' || subRoute.category === subnavCategory)
                                    .map((subRoute) => {
                                        const isSubActive = subRoute.exact
                                            ? location.pathname === `/server/${id}${subRoute.path}` || location.pathname === `/server/${id}${subRoute.path}/`
                                            : location.pathname.includes(subRoute.path);

                                        const linkElement = (
                                            <NavLink
                                                key={subRoute.path}
                                                to={to(subRoute.path, true)}
                                                exact={subRoute.exact}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                                                    isSubActive
                                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-neutral-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                                                        : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80 border border-transparent'
                                                }`}
                                            >
                                                {subRoute.name}
                                            </NavLink>
                                        );

                                        return subRoute.permission ? (
                                            <Can key={subRoute.path} action={subRoute.permission} matchAny>
                                                {linkElement}
                                            </Can>
                                        ) : (
                                            linkElement
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                    <InstallListener />
                    <TransferListener />
                    <WebsocketHandler />
                    {inConflictState && (!rootAdmin || (rootAdmin && !location.pathname.endsWith(`/server/${id}`))) ? (
                        <ConflictStateRenderer />
                    ) : (
                        <ErrorBoundary>
                            <TransitionRouter>
                                <Switch location={location}>
                                    {routes.server.map(({ path, permission, component: Component }) => (
                                        <PermissionRoute key={path} permission={permission} path={to(path)} exact>
                                            <Spinner.Suspense>
                                                <Component />
                                            </Spinner.Suspense>
                                        </PermissionRoute>
                                    ))}
                                    <Route path={'*'} component={NotFound} />
                                </Switch>
                            </TransitionRouter>
                        </ErrorBoundary>
                    )}
                </>
            )}
        </React.Fragment>
    );
};
