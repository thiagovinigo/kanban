import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export function KanbanBoard({ columns, items, onDragEnd, onCardClick, renderCardContent, renderColumnHeader }) {
  
  const getItemsForColumn = (columnId) => {
    return items.filter(item => item.column_id === columnId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', minHeight: '600px' }}>
        {columns.map(column => (
          <div key={column.id} className="glass-panel" style={{ minWidth: '320px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                {column.title}
                <span className="badge">
                  {getItemsForColumn(column.id).length}
                </span>
              </h3>
              {renderColumnHeader && renderColumnHeader(column)}
            </div>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    padding: '16px',
                    flexGrow: 1,
                    minHeight: '200px',
                    background: snapshot.isDraggingOver ? 'var(--bg-hover)' : 'transparent',
                    transition: 'background 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {getItemsForColumn(column.id).map((item, index) => (
                    <Draggable key={String(item.id)} draggableId={String(item.id)} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => onCardClick && onCardClick(item)}
                          className="kanban-card"
                          style={{
                            ...provided.draggableProps.style,
                            borderColor: snapshot.isDragging ? 'var(--accent-purple)' : 'var(--border-subtle)',
                            boxShadow: snapshot.isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)'
                          }}
                        >
                          {renderCardContent ? renderCardContent(item) : (
                            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{item.title}</h4>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
