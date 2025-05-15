<template>
  <modals-modal v-model="show" name="player-settings" :width="500" :height="'unset'">
    <div ref="container" class="w-full rounded-lg bg-bg box-shadow-md overflow-y-auto overflow-x-hidden p-4" style="max-height: 80vh; min-height: 40vh">
      <h3 class="text-xl font-semibold mb-8">{{ $strings.HeaderPlayerSettings }}</h3>
      <div class="flex items-center mb-4">
        <ui-toggle-switch v-model="useChapterTrack" @input="setUseChapterTrack" />
        <div class="pl-4">
          <span>{{ $strings.LabelUseChapterTrack }}</span>
        </div>
      </div>
      <div class="flex items-center mb-4">
        <ui-select-input v-model="jumpForwardAmount" :label="$strings.LabelJumpForwardAmount" menuMaxHeight="250px" :items="jumpValues" @input="setJumpForwardAmount" />
      </div>
      <div class="flex items-center mb-4">
        <ui-select-input v-model="jumpBackwardAmount" :label="$strings.LabelJumpBackwardAmount" menuMaxHeight="250px" :items="jumpValues" @input="setJumpBackwardAmount" />
      </div>
      <div class="flex items-center mb-4">
        <ui-select-input v-model="playbackRateIncrementDecrement" :label="$strings.LabelPlaybackRateIncrementDecrement" menuMaxHeight="250px" :items="playbackRateIncrementDecrementValues" @input="setPlaybackRateIncrementDecrementAmount" />
      </div>
      <div class="flex items-center mb-4">
        <ui-toggle-switch v-model="smartSpeedEnabled" @input="setSmartSpeedEnabled" />
        <div class="pl-4">
          <span>{{ $strings.LabelSmartSpeed }}</span>
        </div>
      </div>
      <div class="flex items-center mb-4">
        <ui-select-input
          v-model="smartSpeedMinSec"
          :label="$strings.LabelSmartSpeedMinDuration"
          menuMaxHeight="250px"
          :items="[
            { text: '0.2s', value: 0.2 },
            { text: '0.5s', value: 0.5 },
            { text: '1s', value: 1 },
            { text: '2s', value: 2 }
          ]"
          @input="setSmartSpeedMinSec"
        />
      </div>
    </div>
  </modals-modal>
</template>

<script>
export default {
  props: {
    value: Boolean
  },
  data() {
    return {
      useChapterTrack: false,
      jumpValues: [
        { text: this.$getString('LabelTimeDurationXSeconds', ['10']), value: 10 },
        { text: this.$getString('LabelTimeDurationXSeconds', ['15']), value: 15 },
        { text: this.$getString('LabelTimeDurationXSeconds', ['30']), value: 30 },
        { text: this.$getString('LabelTimeDurationXSeconds', ['60']), value: 60 },
        { text: this.$getString('LabelTimeDurationXMinutes', ['2']), value: 120 },
        { text: this.$getString('LabelTimeDurationXMinutes', ['5']), value: 300 }
      ],
      jumpForwardAmount: 10,
      jumpBackwardAmount: 10,
      playbackRateIncrementDecrementValues: [0.1, 0.05],
      playbackRateIncrementDecrement: 0.1,
      smartSpeedEnabled: false,
      smartSpeedMinSec: 0.5
    }
  },
  computed: {
    show: {
      get() {
        return this.value
      },
      set(val) {
        this.$emit('input', val)
      }
    }
  },
  methods: {
    setUseChapterTrack() {
      this.$store.dispatch('user/updateUserSettings', { useChapterTrack: this.useChapterTrack })
    },
    setJumpForwardAmount(val) {
      this.jumpForwardAmount = val
      this.$store.dispatch('user/updateUserSettings', { jumpForwardAmount: val })
    },
    setJumpBackwardAmount(val) {
      this.jumpBackwardAmount = val
      this.$store.dispatch('user/updateUserSettings', { jumpBackwardAmount: val })
    },
    setPlaybackRateIncrementDecrementAmount(val) {
      this.playbackRateIncrementDecrement = val
      this.$store.dispatch('user/updateUserSettings', { playbackRateIncrementDecrement: val })
    },
    setSmartSpeedEnabled() {
      this.$store.dispatch('user/updateUserSettings', { smartSpeedEnabled: this.smartSpeedEnabled })
    },
    setSmartSpeedMinSec(val) {
      this.smartSpeedMinSec = val
      this.$store.dispatch('user/updateUserSettings', { smartSpeedMinSec: val })
    },
    settingsUpdated() {
      this.useChapterTrack = this.$store.getters['user/getUserSetting']('useChapterTrack')
      this.jumpForwardAmount = this.$store.getters['user/getUserSetting']('jumpForwardAmount')
      this.jumpBackwardAmount = this.$store.getters['user/getUserSetting']('jumpBackwardAmount')
      this.playbackRateIncrementDecrement = this.$store.getters['user/getUserSetting']('playbackRateIncrementDecrement')
      this.smartSpeedEnabled = this.$store.getters['user/getUserSetting']('smartSpeedEnabled')
      this.smartSpeedMinSec = this.$store.getters['user/getUserSetting']('smartSpeedMinSec')
    }
  },
  mounted() {
    this.settingsUpdated()
    this.$eventBus.$on('user-settings', this.settingsUpdated)
  },
  beforeDestroy() {
    this.$eventBus.$off('user-settings', this.settingsUpdated)
  }
}
</script>
