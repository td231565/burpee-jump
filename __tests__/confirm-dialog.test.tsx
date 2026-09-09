import { render, fireEvent } from '@testing-library/react-native';
import { ConfirmDialog } from '../src/components/ui/confirm-dialog';

describe('ConfirmDialog UI Primitive', () => {
  it('visible 為 false 時不呈現內容', () => {
    const { queryByText } = render(
      <ConfirmDialog
        visible={false}
        title="確認對話框"
        message="訊息文字"
        confirmText="確認"
        cancelText="取消"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(queryByText('確認對話框')).toBeNull();
  });

  it('visible 為 true 時呈現標題、訊息與按鈕，點擊觸發回呼', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { getByText } = render(
      <ConfirmDialog
        visible={true}
        title="確定要取消訓練嗎？"
        message="本次訓練將不會被記錄"
        confirmText="放棄並離開"
        cancelText="繼續訓練"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(getByText('確定要取消訓練嗎？')).toBeTruthy();
    expect(getByText('本次訓練將不會被記錄')).toBeTruthy();

    fireEvent.press(getByText('繼續訓練'));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText('放棄並離開'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
