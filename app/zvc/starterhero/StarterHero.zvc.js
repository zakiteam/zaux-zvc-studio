import ZVCHelper from '@zx_core/common/helpers/zvc.helper';
import meta from './StarterHero.meta';
import defaults from './data/StarterHero.defaults';

export default {
  ...meta,
  buildNode(data = {}, params = {}) {
    data = { ...defaults, ...data };
    const gv = (path) => ZVCHelper.getValue(data, path);
    const nodeObject = {
      meta: { ZVCName: meta.ZVCName },
      node: {
        name: 'Zsection',
        props: {
          size: gv('sectionSize'),
          contained: true,
          content: {
            type: 'component',
            name: 'IntroText',
            props: {
              eyelet: gv('eyelet'),
              title: gv('title'),
              excerpt: gv('excerpt'),
              ctas: gv('showButton') ? [{ label: gv('buttonLabel'), href: gv('buttonHref'), theme: 'primary' }] : []
            }
          }
        }
      }
    };
    return ZVCHelper.renderNode(nodeObject, data, params, meta);
  }
};
