import { useState } from 'react';
import { useNavigate } from 'react-router';
import { paths } from '@/app/paths';
import { Button, Input, Modal } from '@/shared/ui';
import { useCreateForum } from '../hooks';

export default function CreateForumModal({ open, onClose }) {
    const [title, setTitle] = useState('');
    const create = useCreateForum();
    const navigate = useNavigate();
    const valid = title.trim().length >= 3;

    const submit = (event) => {
        event.preventDefault();
        if (!valid) return;
        create.mutate(title.trim(), {
            onSuccess: (forum) => {
                setTitle('');
                onClose();
                navigate(paths.forum(forum.id));
            },
        });
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Pornește o discuție nouă"
            description="Alege un titlu clar, ca ceilalți cititori să știe despre ce vorbim."
            footer={(
                <>
                    <Button variant="ghost" onClick={onClose}>Renunță</Button>
                    <Button type="submit" form="create-forum" loading={create.isPending} disabled={!valid}>Creează forumul</Button>
                </>
            )}
        >
            <form id="create-forum" onSubmit={submit}>
                <Input
                    label="Titlul forumului"
                    placeholder="ex: Cele mai bune romane SF din ultimii 10 ani"
                    value={title}
                    maxLength={255}
                    autoFocus
                    onChange={(event) => setTitle(event.target.value)}
                    hint="Minimum 3 caractere."
                />
            </form>
        </Modal>
    );
}
