import { useDittoChatStore } from "@dittolive/ditto-chat-core";

export function usePermissions() {
    const canPerformAction = useDittoChatStore(
        (state) => state.canPerformAction
    );

    return {
        /** Generic permission check function */
        canPerformAction,

        /** Check if user can create new group rooms */
        canCreateRoom: canPerformAction("canCreateRoom"),

        /** Check if user can edit their own messages */
        canEditOwnMessage: canPerformAction("canEditOwnMessage"),

        /** Check if user can delete their own messages */
        canDeleteOwnMessage: canPerformAction("canDeleteOwnMessage"),

        /** Check if user can add reactions to messages */
        canAddReaction: canPerformAction("canAddReaction"),

        /** Check if user can remove their own reactions */
        canRemoveOwnReaction: canPerformAction("canRemoveOwnReaction"),

        /** Check if user can mention other users */
        canMentionUsers: canPerformAction("canMentionUsers"),

        /** Check if user can subscribe to room notifications */
        canSubscribeToRoom: canPerformAction("canSubscribeToRoom"),
    };
}
