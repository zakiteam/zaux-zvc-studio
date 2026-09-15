import ZVCHelper from '@zx_core/common/helpers/zvc.helper';
import meta from './ProjectCard.meta.js';
import defaults from './data/ProjectCard.defaults.js';

export default {
  ...meta,
  buildNode(data = {}, params = {}) {
    data = { ...defaults, ...data };
    const gv = path => ZVCHelper.getValue(data, path);
    const nodeObject = {
      node: {
        name: 'article',
        props: { class: 'h-full overflow-hidden rounded-m bg-zaux-light ' + gv('class') },
        children: [
          ...(gv('showImage') ? [{ name: 'Zimg', props: { src: gv('image'), alt: gv('title'), class: 'block aspect-video w-full' } }] : []),
          { name: 'div', props: { class: 'p-6 flex flex-col gap-4' }, children: [
            { name: 'IntroText', props: { title: gv('title'), excerpt: gv('excerpt'), size: gv('size'), titleTag: 'h3' } },
            ...(gv('showButton') ? [{ name: 'ZButton', props: gv('button') }] : [])
          ] }
        ]
      }
    };
    return ZVCHelper.renderNode(nodeObject, data, params);
  }
};
