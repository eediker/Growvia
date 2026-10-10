import type { Content } from '../domain/models';

export const assets = {
  splash: require('../assets/opening-splash.png'),
  child: require('../assets/child-hub-card.png'),
  classroom: require('../assets/class-hub-card.png'),
  recommendation: require('../assets/home-reco.png'),
  activity: require('../assets/activity-hero.png'),
  story: require('../assets/story-fox.png'),
  moon: require('../assets/story-moon.png'),
  guide: require('../assets/guide-1.png'),
  guide2: require('../assets/guide-2.png'),
  guide3: require('../assets/guide-3.png'),
  guide4: require('../assets/guide-4.png'),
};
export function contentImage(item: Pick<Content, 'kind' | 'area'>) {
  if (item.kind === 'activity') return item.area === 'nature' ? assets.recommendation : assets.activity;
  if (item.kind === 'story') return item.area === 'connection' ? assets.moon : assets.story;
  return item.area === 'language' ? assets.guide2 : item.area === 'movement' ? assets.guide3 : item.area === 'connection' ? assets.guide4 : assets.guide;
}
